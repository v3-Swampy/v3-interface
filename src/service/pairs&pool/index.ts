import { getWrapperTokenByAddress } from './../tokens/tokens';
export * from './allRelatedPools';
export * from './singlePool';
import { type Token } from '@service/tokens';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Decimal from 'decimal.js';

const Q192Unit = Unit.fromMinUnit(new Decimal(2).toPower(192).toString());

export enum FeeAmount {
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

interface PoolProps {
  token0: Token;
  token1: Token;
  fee: FeeAmount;
  address: string;
  sqrtPriceX96: string | null;
  liquidity: string | null;
  tickCurrent: number | null;
}

export class Pool implements PoolProps {
  public token0: Token;
  public token1: Token;
  public fee: FeeAmount;
  public address: string;
  public sqrtPriceX96: string | null;
  public liquidity: string | null;
  public tickCurrent: number | null;
  public token0Price: Unit | null;
  public token1Price: Unit | null;
  constructor({ tokenA, tokenB, fee, address, sqrtPriceX96, liquidity, tickCurrent }: Omit<PoolProps, 'token0' | 'token1'> & { tokenA: Token; tokenB: Token }) {
    const [token0, token1] = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA]; // does safety checks
    this.token0 = token0;
    this.token1 = token1;
    this.fee = fee;
    this.address = address;
    this.sqrtPriceX96 = sqrtPriceX96;
    this.liquidity = liquidity;
    this.tickCurrent = tickCurrent;
    this.token0Price = !sqrtPriceX96 ? null : Unit.fromMinUnit(sqrtPriceX96).mul(Unit.fromMinUnit(sqrtPriceX96)).div(Q192Unit);
    this.token1Price = !sqrtPriceX96 ? null : Unit.fromMinUnit(1).div(this.token0Price!);
  }

  public priceOf = (token: Token) => {
    const wrapperTokenByAddress = getWrapperTokenByAddress(token.address)!;
    if (!wrapperTokenByAddress?.address) return undefined;
    if (wrapperTokenByAddress.address === this.token0.address) return this.token0Price;
    if (wrapperTokenByAddress.address === this.token1.address) return this.token1Price;
    return null;
  };
}

export const isPoolEqual = (poolA: Pool | null | undefined, poolB: Pool | null | undefined) => {
  if ((poolA === undefined && poolB !== undefined) || (poolA !== undefined && poolB === undefined)) return false;
  if (!(poolA && poolB)) return true;
  return poolA.sqrtPriceX96 === poolB.sqrtPriceX96 && poolA.liquidity === poolB.liquidity && poolA.tickCurrent === poolB.tickCurrent;
};

export const calcTickFromPrice = ({ price, tokenA, tokenB }: { price: Unit; tokenA: Token; tokenB: Token }) => {
  const [token0, token1] = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];
  const usedPrice = typeof price !== 'object' ? Unit.fromMinUnit(price) : price;
  return Unit.log(usedPrice.mul(Unit.fromMinUnit(`1e${token1.decimals}`)).div(Unit.fromMinUnit(`1e${token0.decimals}`)), Unit.fromMinUnit(1.0001));
};

export const calcPriceFromTick = ({ tick, tokenA, tokenB, fee }: { tick: Unit | number | string; tokenA: Token; tokenB: Token; fee?: FeeAmount }) => {
  const [token0, token1] = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];
  const usedTick = typeof tick !== 'object' ? Unit.fromMinUnit(tick) : tick;

  if (!!fee) {
    if (usedTick.equals(Unit.fromMinUnit(getMinTick(fee)))) return Unit.fromMinUnit(0);
    if (usedTick.equals(Unit.fromMinUnit(getMaxTick(fee)))) return Unit.fromMinUnit('NaN');
  }
  return Unit.fromMinUnit(1.0001)
    .pow(usedTick)
    .mul(Unit.fromMinUnit(`1e${token0.decimals}`))
    .div(Unit.fromMinUnit(`1e${token1.decimals}`));
};

export const findClosestValidTick = ({ fee, searchTick }: { fee: FeeAmount; searchTick: Unit | string | number }) => {
  const usedSearchTick = typeof searchTick !== 'object' ? Unit.fromMinUnit(searchTick) : searchTick;

  const atom = Unit.fromMinUnit(fee / 50);
  const r = usedSearchTick.mod(atom);
  if (r.lessThan(atom.div(Unit.fromMinUnit(2)))) {
    return usedSearchTick.sub(r);
  } else {
    return usedSearchTick.add(atom).sub(r);
  }
};

export const findClosestValidPrice = ({ fee, searchPrice, tokenA, tokenB }: { fee: FeeAmount; searchPrice: Unit | string | number; tokenA: Token; tokenB: Token }) => {
  const usedSearchPrice = typeof searchPrice !== 'object' ? Unit.fromMinUnit(searchPrice) : searchPrice;
  const tick = calcTickFromPrice({ price: usedSearchPrice, tokenA, tokenB });
  const closestValidTick = findClosestValidTick({ fee, searchTick: tick });
  return calcPriceFromTick({ tick: closestValidTick, tokenA, tokenB });
};

const MIN_TICK_Base = -887272;
export const getMinTick = (fee: FeeAmount) => +findClosestValidTick({ fee, searchTick: MIN_TICK_Base }).toDecimalMinUnit();
export const getMaxTick = (fee: FeeAmount) => -getMinTick(fee);
