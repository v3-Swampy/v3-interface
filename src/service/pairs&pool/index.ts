export * from './allRelatedPools';
export * from './singlePool';
import { type Token } from '@service/tokens';

export enum FeeAmount {
  LOWEST = 100,
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

export interface Pool {
  tokenA: Token;
  tokenB: Token;
  fee: FeeAmount;
  address: string;
  sqrtPriceX96: string;
  liquidity: string;
  tick: string;
}