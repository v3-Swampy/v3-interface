import { Percent } from '@uniswap/sdk-core';
import { Pool as PoolUni, Position } from '@uniswap/v3-sdk';
import { FeeAmount, type Pool } from '@service/pairs&pool';
import { convertTokenToUniToken, type Token } from '@service/tokens';
import JSBI from 'jsbi';

export const calcAmountMinWithSlippageTolerance = ({
  pool,
  fee,
  token0,
  token1,
  tickLower,
  tickUpper,
  token0Amount,
  token1Amount,
  slippageTolerance,
}: {
  pool: Pool | null;
  token0: Token;
  token1: Token;
  fee: FeeAmount;
  tickLower: number;
  tickUpper: number;
  token0Amount: string;
  token1Amount: string;
  slippageTolerance: number;
}) => {
  const position = Position.fromAmounts({
    pool: new PoolUni(convertTokenToUniToken(token0), convertTokenToUniToken(token1), fee, JSBI.BigInt(pool?.sqrtPriceX96 ?? 0), 0, pool?.tickCurrent ?? 0, []),
    tickLower,
    tickUpper,
    amount0: token0Amount.split('.')[0],
    amount1: token1Amount.split('.')[0],
    useFullPrecision: true, // we want full precision for the theoretical position
  });

  const res = position.mintAmountsWithSlippage(new Percent(slippageTolerance * 10000, 10000));
  return {
    amount0Min: res.amount0.toString(),
    amount1Min: res.amount1.toString(),
  }
};
