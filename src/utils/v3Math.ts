import { SqrtPriceMath, TickMath, maxLiquidityForAmounts } from '@uniswap/v3-sdk';
import JSBI from 'jsbi';
import Decimal from 'decimal.js';

/**
 * Uniswap V3 的纯数学工具。
 *
 * 这里刻意不依赖任何 service，避免 `service/settings` 与 `service/earn` 之间出现循环依赖。
 * 所有函数都以「最小单位（raw）」为输入输出，与合约实现保持同一套取整方向：
 * - liquidity 反算与 `LiquidityAmounts.getLiquidityForAmounts` 一致（向下取整）
 * - amount 反算与 `UniswapV3Pool.mint` 一致（向上取整）
 */

/** TickMath 支持的 tick 区间 */
export const MIN_TICK = -887272;
export const MAX_TICK = 887272;

/** TickMath 支持的 sqrtPrice 区间（Q64.96） */
const MIN_SQRT_RATIO = JSBI.BigInt('4295128739');
const MAX_SQRT_RATIO = JSBI.BigInt('1461446703485210103287273052203988822378723970342');

const Q192 = new Decimal(2).toPower(192);
const ZERO = JSBI.BigInt(0);

export const clampTick = (tick: number) => Math.min(Math.max(Math.trunc(tick), MIN_TICK), MAX_TICK);

export const sqrtRatioAtTick = (tick: number) => TickMath.getSqrtRatioAtTick(clampTick(tick));

/** 把 sqrtRatio 夹到 TickMath 允许的区间内，避免 `getTickAtSqrtRatio` 抛错 */
export const clampSqrtRatioX96 = (sqrtRatioX96: JSBI) => {
  if (JSBI.lessThanOrEqual(sqrtRatioX96, MIN_SQRT_RATIO)) return JSBI.add(MIN_SQRT_RATIO, JSBI.BigInt(1));
  if (JSBI.greaterThanOrEqual(sqrtRatioX96, MAX_SQRT_RATIO)) return JSBI.subtract(MAX_SQRT_RATIO, JSBI.BigInt(1));
  return sqrtRatioX96;
};

/** 标准单位的价格（token1 per token0）→ sqrtPriceX96 */
export const priceToSqrtPriceX96 = ({
  price,
  token0Decimals,
  token1Decimals,
}: {
  price: Decimal.Value;
  token0Decimals: number;
  token1Decimals: number;
}) =>
  Decimal.sqrt(
    new Decimal(price)
      .mul(new Decimal(10).toPower(token1Decimals))
      .div(new Decimal(10).toPower(token0Decimals))
      .mul(Q192)
  ).toFixed(0);

/**
 * 由 desired amounts 反算 liquidity。
 * 等同于合约里的 `LiquidityAmounts.getLiquidityForAmounts`（0.7.6 / 非 full-precision 分支）。
 */
export const calcLiquidityForAmounts = ({
  sqrtPriceX96,
  tickLower,
  tickUpper,
  amount0,
  amount1,
}: {
  sqrtPriceX96: string;
  tickLower: number;
  tickUpper: number;
  amount0: string;
  amount1: string;
}) =>
  maxLiquidityForAmounts(
    JSBI.BigInt(sqrtPriceX96),
    sqrtRatioAtTick(tickLower),
    sqrtRatioAtTick(tickUpper),
    JSBI.BigInt(amount0),
    JSBI.BigInt(amount1),
    true
  );

/**
 * 给定 liquidity 与 sqrtPrice，计算会被池子实际收走的 amounts。
 * 取整方向与 `UniswapV3Pool.mint` 一致（向上取整），所以结果就是用户钱包真正的支出。
 */
export const calcAmountsForLiquidity = ({
  sqrtPriceX96,
  tickLower,
  tickUpper,
  liquidity,
}: {
  sqrtPriceX96: string;
  tickLower: number;
  tickUpper: number;
  liquidity: JSBI;
}): { amount0: JSBI; amount1: JSBI } => {
  const sqrtRatioX96 = JSBI.BigInt(sqrtPriceX96);
  const sqrtRatioAX96 = sqrtRatioAtTick(tickLower);
  const sqrtRatioBX96 = sqrtRatioAtTick(tickUpper);

  if (JSBI.lessThanOrEqual(sqrtRatioX96, sqrtRatioAX96)) {
    return { amount0: SqrtPriceMath.getAmount0Delta(sqrtRatioAX96, sqrtRatioBX96, liquidity, true), amount1: ZERO };
  }
  if (JSBI.lessThan(sqrtRatioX96, sqrtRatioBX96)) {
    return {
      amount0: SqrtPriceMath.getAmount0Delta(sqrtRatioX96, sqrtRatioBX96, liquidity, true),
      amount1: SqrtPriceMath.getAmount1Delta(sqrtRatioAX96, sqrtRatioX96, liquidity, true),
    };
  }
  return { amount0: ZERO, amount1: SqrtPriceMath.getAmount1Delta(sqrtRatioAX96, sqrtRatioBX96, liquidity, true) };
};

/**
 * 滑点后的 sqrtRatio 上下界。
 * 直接在 sqrtPrice 上缩放（`sqrt(p) * sqrt(1 ± s)`），而不是 `price → encodeSqrtRatioX96` 往返，
 * 这样 slippage 为 0 时上下界都精确等于当前 sqrtPrice，不会因为往返精度让 min > 实际存入量。
 * 下界向下取整、上界向上取整，方向永远是「更宽松」，不会无故 revert。
 */
export const sqrtRatioBoundsAfterSlippage = (sqrtPriceX96: string, slippage: number) => {
  const sqrtRatio = new Decimal(sqrtPriceX96);
  const tolerance = Math.min(Math.max(slippage, 0), 0.5);
  const lower = sqrtRatio.mul(Decimal.sqrt(1 - tolerance)).toFixed(0, Decimal.ROUND_FLOOR);
  const upper = sqrtRatio.mul(Decimal.sqrt(1 + tolerance)).toFixed(0, Decimal.ROUND_CEIL);
  return {
    lower: clampSqrtRatioX96(JSBI.BigInt(lower)),
    upper: clampSqrtRatioX96(JSBI.BigInt(upper)),
  };
};
