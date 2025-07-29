import { UniswapV3Factory } from '@contracts/index';
import { type Token } from '@service/tokens';
import { FeeAmount } from '.';

export const isPoolExist = async ({ tokenA, tokenB, fee }: { tokenA: Token; tokenB: Token; fee: FeeAmount }) => {
  const [token0, token1] = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA]; // does safety checks
  return UniswapV3Factory.func.getPool(token0.address, token1.address, fee).then((res) => {
    if (typeof res !== 'string' || res === '0x') {
      return false;
    }
    const poolAddress = res;
    return poolAddress !== '0x0000000000000000000000000000000000000000';
  });
};