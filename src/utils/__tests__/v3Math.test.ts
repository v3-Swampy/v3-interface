import { describe, expect, it } from 'vitest';
import JSBI from 'jsbi';
import { calcAmountsForLiquidity, calcLiquidityForAmounts, priceToSqrtPriceX96, sqrtRatioBoundsAfterSlippage } from '../v3Math';

const tickLower = -887220;
const tickUpper = 887220;

describe('v3Math', () => {
  const sqrtPriceX96 = priceToSqrtPriceX96({ price: '0.25', token0Decimals: 18, token1Decimals: 6 });
  const amount0 = (1000n * 10n ** 18n).toString();
  const amount1 = (250n * 10n ** 6n).toString();

  it('does not consume more than desired', () => {
    const liquidity = calcLiquidityForAmounts({ sqrtPriceX96, tickLower, tickUpper, amount0, amount1 });
    const { amount0: spent0, amount1: spent1 } = calcAmountsForLiquidity({ sqrtPriceX96, tickLower, tickUpper, liquidity });
    expect(JSBI.lessThanOrEqual(spent0, JSBI.BigInt(amount0))).toBe(true);
    expect(JSBI.lessThanOrEqual(spent1, JSBI.BigInt(amount1))).toBe(true);
    // 价格与数量比例一致时两侧都应该被吃满（只允许取整误差）
    expect(Number(spent0.toString()) / Number(amount0)).toBeGreaterThan(0.999999);
    expect(Number(spent1.toString()) / Number(amount1)).toBeGreaterThan(0.999999);
  });

  it('keeps the exact sqrt ratio when slippage is 0', () => {
    const { lower, upper } = sqrtRatioBoundsAfterSlippage(sqrtPriceX96, 0);
    expect(lower.toString()).toBe(sqrtPriceX96);
    expect(upper.toString()).toBe(sqrtPriceX96);
  });

  it('widens the bound with slippage', () => {
    const { lower, upper } = sqrtRatioBoundsAfterSlippage(sqrtPriceX96, 0.005);
    expect(Number(lower.toString())).toBeLessThan(Number(sqrtPriceX96));
    expect(Number(upper.toString())).toBeGreaterThan(Number(sqrtPriceX96));
  });

  it('min amounts never exceed what is actually deposited', () => {
    const liquidity = calcLiquidityForAmounts({ sqrtPriceX96, tickLower, tickUpper, amount0, amount1 });
    const { amount0: spent0, amount1: spent1 } = calcAmountsForLiquidity({ sqrtPriceX96, tickLower, tickUpper, liquidity });
    const { lower, upper } = sqrtRatioBoundsAfterSlippage(sqrtPriceX96, 0.005);
    const { amount0: min0 } = calcAmountsForLiquidity({ sqrtPriceX96: upper.toString(), tickLower, tickUpper, liquidity });
    const { amount1: min1 } = calcAmountsForLiquidity({ sqrtPriceX96: lower.toString(), tickLower, tickUpper, liquidity });
    expect(JSBI.lessThanOrEqual(min0, spent0)).toBe(true);
    expect(JSBI.lessThanOrEqual(min1, spent1)).toBe(true);
    // 0.5% 容差下不应偏离太多
    expect(Number(min0.toString()) / Number(spent0.toString())).toBeGreaterThan(0.99);
    expect(Number(min1.toString()) / Number(spent1.toString())).toBeGreaterThan(0.99);
  });
});
