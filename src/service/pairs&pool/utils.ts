import { UniswapV3Factory } from '@contracts/index';
import { fetchChain } from '@utils/fetch';
import { type Token } from '@service/tokens';
import { FeeAmount } from '.';

export const isPoolExist = async ({ tokenA, tokenB, fee }: { tokenA: Token; tokenB: Token; fee: FeeAmount }) =>
  fetchChain({
    params: [
      {
        to: UniswapV3Factory.address,
        data: UniswapV3Factory.func.encodeFunctionData('getPool', [tokenA.address, tokenB.address, fee]),
      },
    ],
  }).then((res) => {
    if (typeof res !== 'string' || res === '0x') {
      return false;
    }
    const poolAddress = UniswapV3Factory.func.decodeFunctionResult('getPool', res)?.[0];
    return poolAddress !== '0x0000000000000000000000000000000000000000';
  });
