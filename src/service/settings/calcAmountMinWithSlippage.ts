import { TickMath, SqrtPriceMath, maxLiquidityForAmounts } from '@uniswap/v3-sdk';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import JSBI from 'jsbi';
import Decimal from 'decimal.js';

const Q192 = new Decimal(2).toPower(192);

//  The minimum tick that can be used on any pool.
const MIN_SQRT_RATIO = /*#__PURE__*/ new Unit('4295128739');
// The sqrt ratio corresponding to the maximum tick that could be used on any pool.
const MAX_SQRT_RATIO = /*#__PURE__*/ new Unit('1461446703485210103287273052203988822378723970342');

// get Q64.96 for sqr price
const encodeSqrtRatioX96 = (priceInit: string) => {
  return Decimal.sqrt(new Decimal(priceInit).mul(Q192)).toFixed(0);
};

/**
 * Returns the lower and upper sqrt ratios if the price 'slips' up to slippage tolerance percentage
 * @param slippage The amount by which the price can 'slip' before the transaction will revert
 * @param currentToken0Price The current token0 price
 * @returns The sqrt ratios after slippage
 */
const ratiosAfterSlippage = (slippage: number, currentToken0Price: string | Unit): { sqrtRatioX96Lower: JSBI; sqrtRatioX96Upper: JSBI } => {
  const priceLower = new Unit(currentToken0Price).mul(new Unit(1).sub(slippage)).toDecimalMinUnit();
  const priceUpper = new Unit(currentToken0Price).mul(new Unit(1).add(slippage)).toDecimalMinUnit();

  let sqrtRatioX96Lower = encodeSqrtRatioX96(priceLower);
  let sqrtRatioX96Upper = encodeSqrtRatioX96(priceUpper);

  if (new Unit(sqrtRatioX96Lower).lessThanOrEqualTo(MIN_SQRT_RATIO)) {
    sqrtRatioX96Lower = MIN_SQRT_RATIO.add(1).toDecimalMinUnit();
  }

  if (new Unit(sqrtRatioX96Upper).greaterThanOrEqualTo(MAX_SQRT_RATIO)) {
    sqrtRatioX96Lower = MAX_SQRT_RATIO.sub(1).toDecimalMinUnit();
  }

  console.log('sqrtRatioX96Lower', sqrtRatioX96Lower);
  console.log('sqrtRatioX96Upper', sqrtRatioX96Upper);

  return {
    sqrtRatioX96Lower: JSBI.BigInt(sqrtRatioX96Lower),
    sqrtRatioX96Upper: JSBI.BigInt(sqrtRatioX96Upper),
  };
};

/**
 * Returns the minimum amounts that must be sent in order to mint the amount of liquidity held by the position at
 * the current price for the pool
 */
const getMintAmounts = (
  tickCurrent: number,
  tickLower: number,
  tickUpper: number,
  liquidity: JSBI | number | string,
  sqrtRatioX96: JSBI
): Readonly<{ amount0: JSBI; amount1: JSBI }> => {
  if (new Unit(tickCurrent).lessThan(tickLower)) {
    return {
      amount0: SqrtPriceMath.getAmount0Delta(TickMath.getSqrtRatioAtTick(tickLower), TickMath.getSqrtRatioAtTick(tickUpper), JSBI.BigInt(liquidity), true),
      amount1: JSBI.BigInt(0),
    };
  } else if (new Unit(tickCurrent).lessThan(tickUpper)) {
    return {
      amount0: SqrtPriceMath.getAmount0Delta(sqrtRatioX96, TickMath.getSqrtRatioAtTick(tickUpper), JSBI.BigInt(liquidity), true),
      amount1: SqrtPriceMath.getAmount1Delta(TickMath.getSqrtRatioAtTick(tickLower), sqrtRatioX96, JSBI.BigInt(liquidity), true),
    };
  } else {
    return {
      amount0: JSBI.BigInt(0),
      amount1: SqrtPriceMath.getAmount1Delta(TickMath.getSqrtRatioAtTick(tickLower), TickMath.getSqrtRatioAtTick(tickUpper), JSBI.BigInt(liquidity), true),
    };
  }
};

const calcLiquidity = (sqrtRatioCurrentX96: JSBI, tickLower: number, tickUpper: number, amount0: JSBI | string, amount1: JSBI | string, useFullPrecision: boolean): JSBI => {
  const sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(tickLower);
  const sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(tickUpper);
  console.log('sqrtRatioAX96', String(sqrtRatioAX96));
  console.log('sqrtRatioBX96', String(sqrtRatioBX96));
  return maxLiquidityForAmounts(sqrtRatioCurrentX96, sqrtRatioAX96, sqrtRatioBX96, amount0, amount1, useFullPrecision);
};

/**
 * Returns the minimum amounts that must be sent in order to safely mint the amount of liquidity held by the position
 * with the given slippage tolerance
 * @returns The amounts, with slippage
 */

export const calcAmountMinWithSlippage = (
  sqrtPriceX96: string,
  slippage: number,
  currentToken0Price: string | Unit,
  tickLower: number,
  tickUpper: number,
  amount0: string,
  amount1: string
): Readonly<{ amount0Min: string; amount1Min: string }> => {
  const { sqrtRatioX96Upper, sqrtRatioX96Lower } = ratiosAfterSlippage(slippage, currentToken0Price);

  const liquidity = calcLiquidity(JSBI.BigInt(sqrtPriceX96), tickLower, tickUpper, amount0, amount1, false);
  console.log('liquidity', liquidity.toString());

  const { amount0: amount0Min } = getMintAmounts(TickMath.getTickAtSqrtRatio(sqrtRatioX96Upper), tickLower, tickUpper, liquidity, sqrtRatioX96Upper);
  const { amount1: amount1Min } = getMintAmounts(TickMath.getTickAtSqrtRatio(sqrtRatioX96Lower), tickLower, tickUpper, liquidity, sqrtRatioX96Lower);

  console.log('amount0Min', amount0Min.toString());
  console.log('amount1Min', amount1Min.toString());

  return { amount0Min: amount0Min.toString(), amount1Min: amount1Min.toString() };
};
