import JSBI from 'jsbi';
import {
  calcAmountsForLiquidity,
  calcLiquidityForAmounts,
  sqrtRatioBoundsAfterSlippage,
} from '@utils/v3Math';

const ZERO = JSBI.BigInt(0);

/** min 不可能高于用户输入，边界情况下（精度、价格落在区间外）也不会让交易因为 min 过大而 revert */
const clampToDesired = (amountMin: JSBI, amountDesired: string) => {
  const desired = JSBI.BigInt(amountDesired);
  return JSBI.lessThan(amountMin, desired) ? amountMin : desired;
};

/**
 * 按滑点容差算出 `mint` / `increaseLiquidity` 应该携带的最小 amounts。
 *
 * 思路与 Uniswap 官方一致：先用 desired amounts 反算 liquidity（合约真正会接受的流动性），
 * 再让价格向上/向下各滑动一个容差，取两种情况下更小的那一侧作为下界。
 * 因此「min」衡量的是实际存入量，而不是用户输入量。
 */
export const calcAmountMinWithSlippage = ({
  sqrtPriceX96,
  slippage,
  tickLower,
  tickUpper,
  amount0,
  amount1,
}: {
  /** 本次交易真正会生效的 sqrtPriceX96 */
  sqrtPriceX96: string;
  slippage: number;
  tickLower: number;
  tickUpper: number;
  /** desired amounts，最小单位 */
  amount0: string;
  amount1: string;
}): Readonly<{ amount0Min: string; amount1Min: string }> => {
  const liquidity = calcLiquidityForAmounts({ sqrtPriceX96, tickLower, tickUpper, amount0, amount1 });
  if (JSBI.equal(liquidity, ZERO)) return { amount0Min: '0', amount1Min: '0' };

  const { lower, upper } = sqrtRatioBoundsAfterSlippage(sqrtPriceX96, slippage);

  // 价格上滑时 token0 的需求变少，下滑时 token1 的需求变少
  const { amount0: amount0Min } = calcAmountsForLiquidity({ sqrtPriceX96: upper.toString(), tickLower, tickUpper, liquidity });
  const { amount1: amount1Min } = calcAmountsForLiquidity({ sqrtPriceX96: lower.toString(), tickLower, tickUpper, liquidity });

  return {
    amount0Min: clampToDesired(amount0Min, amount0).toString(),
    amount1Min: clampToDesired(amount1Min, amount1).toString(),
  };
};
