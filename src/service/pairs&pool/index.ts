export * from './allRelatedPools';
export * from './singlePool';
import { type Token } from '@service/tokens';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Decimal from 'decimal.js';
const Q96Unit = Unit.fromMinUnit(new Decimal(2).toPower(96).toString());
const Q192Unit = Unit.fromMinUnit(new Decimal(2).toPower(192).toString());

export enum FeeAmount {
  LOWEST = 100,
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

interface PoolProps {
  tokenA: Token;
  tokenB: Token;
  fee: FeeAmount;
  address: string;
  sqrtPriceX96: string | null;
  liquidity: string | null;
  tickCurrent: number | null;
}
export class Pool implements PoolProps {
  public tokenA: Token;
  public tokenB: Token;
  public fee: FeeAmount;
  public address: string;
  public sqrtPriceX96: string | null;
  public liquidity: string | null;
  public tickCurrent: number | null;
  private _tokenAPrice: Unit | null = null;
  private _tokenBPrice: Unit | null = null;
  constructor({ tokenA, tokenB, fee, address, sqrtPriceX96, liquidity, tickCurrent }: PoolProps) {
    this.tokenA = tokenA;
    this.tokenB = tokenB;
    this.fee = fee;
    this.address = address;
    this.sqrtPriceX96 = sqrtPriceX96;
    this.liquidity = liquidity;
    this.tickCurrent = tickCurrent;
  }

  public get tokenAPrice() {
    if (!this.sqrtPriceX96) return null;
    return this._tokenAPrice ?? (this._tokenAPrice = Unit.fromMinUnit(this.sqrtPriceX96).mul(Unit.fromMinUnit(this.sqrtPriceX96)).div(Q192Unit));
  }

  public get tokenBPrice() {
    if (!this.sqrtPriceX96) return null;
    return this._tokenBPrice ?? (this._tokenAPrice = Unit.fromMinUnit(1).div(this.tokenAPrice!));
  }

  public priceOf = (token: Token) => {
    if (token.address === this.tokenA.address) return this.tokenAPrice;
    if (token.address === this.tokenB.address) return this.tokenBPrice;
    return null;
  };
}
