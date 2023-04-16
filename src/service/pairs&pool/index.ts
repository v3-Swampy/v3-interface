import { getWrapperTokenByAddress } from './../tokens/tokens';
export * from './allRelatedPools';
export * from './singlePool';
export * from './bestTrade';
export { default as computePoolAddress } from './computePoolAddress';
import { type Token, isTokenEqual } from '@service/tokens';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Decimal from 'decimal.js';

const Q192Unit = new Unit(new Decimal(2).toPower(192).toString());

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
    this.token0Price = !sqrtPriceX96 ? null : new Unit(sqrtPriceX96).mul(new Unit(sqrtPriceX96)).div(Q192Unit);
    this.token1Price = !sqrtPriceX96 ? null : new Unit(1).div(this.token0Price!);
  }

  public priceOf = (token: Token) => {
    const wrapperTokenByAddress = getWrapperTokenByAddress(token.address)!;
    if (!wrapperTokenByAddress?.address) return undefined;
    if (wrapperTokenByAddress.address === this.token0.address) return this.token0Price;
    if (wrapperTokenByAddress.address === this.token1.address) return this.token1Price;
    return null;
  };

  public involvesToken = (token: Token) => {
    return isTokenEqual(this.token0, token) || isTokenEqual(this.token1, token);
  };
}


export const isPoolEqual = (poolA: Pool | null | undefined, poolB: Pool | null | undefined) => {
  if ((poolA && !poolB)  || (!poolA && poolB)) return false;
  if ((poolA === null && poolB === undefined) || (poolA === undefined && poolB === null)) return false;
  if (!poolA && !poolB) return true;
  return poolA?.sqrtPriceX96 === poolB?.sqrtPriceX96 && poolA?.liquidity === poolB?.liquidity && poolA?.tickCurrent === poolB?.tickCurrent;
};

export const calcTickFromPrice = ({ price, tokenA, tokenB }: { price: Unit; tokenA: Token; tokenB: Token }) => {
  const [token0, token1] = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];
  const usedPrice = typeof price !== 'object' ? new Unit(price) : price;
  return Unit.log(usedPrice.mul(new Unit(`1e${token1.decimals}`)).div(new Unit(`1e${token0.decimals}`)), new Unit(1.0001));
};

export const calcPriceFromTick = ({ tick, tokenA, tokenB, fee }: { tick: Unit | number | string; tokenA: Token; tokenB: Token; fee?: FeeAmount }) => {
  const [token0, token1] = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA];
  const usedTick = typeof tick !== 'object' ? new Unit(tick) : tick;

  if (!!fee) {
    if (usedTick.equals(new Unit(getMinTick(fee)))) return new Unit(0);
    if (usedTick.equals(new Unit(getMaxTick(fee)))) return new Unit('Infinity');
  }
  return new Unit(1.0001)
    .pow(usedTick)
    .mul(new Unit(`1e${token0.decimals}`))
    .div(new Unit(`1e${token1.decimals}`));
};

export const calcAmountFromPrice = ({
  liquidity,
  lower,
  upper,
  current,
}: {
  liquidity: Unit | number | string;
  lower: Unit | number | string;
  upper: Unit | number | string;
  current: Unit | number | string;
}) => {
  const usedLiquidity = new Unit(liquidity);
  const usedLower = new Unit(lower);
  const usedUpper = new Unit(upper);
  const usedCurrent = new Unit(current);
  // console.log('amount', usedLiquidity.toDecimalMinUnit(), usedLower.toDecimalMinUnit(), usedUpper.toDecimalMinUnit(), usedCurrent.toDecimalMinUnit());
  let amount0: Unit, amount1: Unit;
  if (usedCurrent.lessThan(usedLower)) {
    //只有amount0
    amount0 = usedLiquidity.mul(usedUpper.sqrt().sub(Unit.sqrt(usedLower))).div(usedUpper.sqrt().mul(Unit.sqrt(usedLower)));
    amount1 = new Unit(0);
  } else if (usedCurrent.greaterThan(usedUpper)) {
    //只有amount1
    amount0 = new Unit(0);
    amount1 = usedLiquidity.mul(usedUpper.sqrt().sub(Unit.sqrt(usedLower)));
  } else {
    // in range
    // amount0 = liquidity * (sqrt(upper) - sqrt(current)) / (sqrt(upper) * sqrt(current))
    // amount1 = liquidity * (sqrt(current) - sqrt(lower))
    // console.log('in range');
    amount0 = usedLiquidity.mul(usedUpper.sqrt().sub(usedCurrent.sqrt())).div(usedUpper.sqrt().mul(usedCurrent.sqrt()));
    amount1 = usedLiquidity.mul(Unit.sqrt(usedCurrent).sub(Unit.sqrt(usedLower)));
  }
  return [amount0, amount1];
};

export const calcRatio = (lower: Unit, current: Unit | null | undefined, upper: Unit) => {
  try {
    if (!current) {
      return undefined;
    }
    if (!current.greaterThan(lower)) {
      return 100;
    } else if (!current.lessThan(upper)) {
      return 0;
    }

    const a = Number.parseFloat(lower.toDecimalMinUnit(15));
    const b = Number.parseFloat(upper.toDecimalMinUnit(15));
    const c = Number.parseFloat(current.toDecimalMinUnit(15));

    // console.log('ratio', a, b, c);

    const ratio = Math.floor((1 / ((Math.sqrt(a * b) - Math.sqrt(b * c)) / (c - Math.sqrt(b * c)) + 1)) * 100);

    if (ratio < 0 || ratio > 100) {
      throw Error('Out of range');
    }
    return ratio;
  } catch {
    return undefined;
  }
};

export const findClosestValidTick = ({ fee, searchTick }: { fee: FeeAmount; searchTick: Unit | string | number }) => {
  const usedSearchTick = typeof searchTick !== 'object' ? new Unit(searchTick) : searchTick;

  const atom = new Unit(fee / 50);
  const r = usedSearchTick.mod(atom);
  if (r.lessThan(atom.div(new Unit(2)))) {
    return usedSearchTick.sub(r);
  } else {
    return usedSearchTick.add(atom).sub(r);
  }
};

export const findClosestValidPrice = ({ fee, searchPrice, tokenA, tokenB }: { fee: FeeAmount; searchPrice: Unit | string | number; tokenA: Token; tokenB: Token }) => {
  const usedSearchPrice = typeof searchPrice !== 'object' ? new Unit(searchPrice) : searchPrice;
  const tick = calcTickFromPrice({ price: usedSearchPrice, tokenA, tokenB });
  const closestValidTick = findClosestValidTick({ fee, searchTick: tick });
  return calcPriceFromTick({ tick: closestValidTick, tokenA, tokenB });
};

export const invertPrice = (price: Unit | string | number) => {
  const usedPrice = new Unit(price);
  const ZERO = new Unit(0);
  if (usedPrice.equals(ZERO)) return new Unit(Infinity);
  if (!usedPrice.isFinite()) return ZERO;
  return new Unit(1).div(usedPrice);
};

const MIN_TICK_Base = -887272;
export const getMinTick = (fee: FeeAmount) => +findClosestValidTick({ fee, searchTick: MIN_TICK_Base }).toDecimalMinUnit();
export const getMaxTick = (fee: FeeAmount) => -getMinTick(fee);
