import { defaultAbiCoder } from '@ethersproject/abi';
import { getCreate2Address } from '@ethersproject/address';
import { keccak256 } from '@ethersproject/solidity';
import { UniswapV3Factory } from '@contracts/index';
import { type Token } from '@service/tokens';
import { LRUCacheFunction } from '@utils/LRUCache';
import { FeeAmount } from './';
import { Token as UniToken } from '@uniswap/sdk-core';

const POOL_INIT_CODE_HASH = '0x21f9fbd4afc79e76492f571c11dd0bcb3b6b948b580e367c86487b679b037db4';

/**
 * Computes a pool address
 * @param factoryAddress The Uniswap V3 factory address
 * @param tokenA The first token of the pair, irrespective of sort order
 * @param tokenB The second token of the pair, irrespective of sort order
 * @param fee The fee tier of the pool
 * @param initCodeHashManualOverride Override the init code hash used to compute the pool address if necessary
 * @returns The pool address
 */
function _computePoolAddress({ tokenA, tokenB, fee=FeeAmount.MEDIUM, initCodeHashManualOverride }: { tokenA: Token|UniToken; tokenB: Token|UniToken; fee?: FeeAmount; initCodeHashManualOverride?: string }): string {
  if (!tokenA || !tokenB) return '';

  const [token0, token1] = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA]; // does safety checks

  return getCreate2Address(
    UniswapV3Factory.address,
    keccak256(['bytes'], [defaultAbiCoder.encode(['address', 'address', 'uint24'], [token0.address, token1.address, fee])]),
    initCodeHashManualOverride ?? POOL_INIT_CODE_HASH
  );
}

const computePoolAddress = LRUCacheFunction(_computePoolAddress, `computePoolAddress-${UniswapV3Factory.address}`);
export default computePoolAddress;
