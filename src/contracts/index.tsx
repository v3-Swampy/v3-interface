import { Contract, type InterfaceAbi } from 'ethers';
import NonfungiblePositionManagerABI from './abis/NonfungiblePositionManager.json';
import SwapRouterABI from './abis/SwapRouter.json';
import UniswapV3FactoryABI from './abis/UniswapV3Factory.json';
import UniswapV3PoolABI from './abis/UniswapV3Pool.json';
import { isProduction } from '@utils/is';

const createContract = (address: string, ABI: InterfaceAbi) => {
  const _Contract = new Contract('', ABI);
  return {
    func: _Contract.interface,
    address,
  } as const;
};

export const NonfungiblePositionManager = createContract(
  isProduction ? '0x892103c345ea74687769657032e702cb1914cde4' : '0x892103c345ea74687769657032e702cb1914cde4',
  NonfungiblePositionManagerABI
);

export const UniswapV3Factory = createContract(isProduction ? '0xe9ff789500b09e68d683cf97e1de0ccd413a7e04' : '0xe9ff789500b09e68d683cf97e1de0ccd413a7e04', UniswapV3FactoryABI);

export const UniswapV3Pool = createContract(isProduction ? '0x0000000000000000000000000000000000000000' : '0x0000000000000000000000000000000000000000', UniswapV3PoolABI);

export const SwapRouter = createContract(isProduction ? '0x55fd38cd37fc097a8b859e5888c04167904092a7' : '0x55fd38cd37fc097a8b859e5888c04167904092a7', SwapRouterABI);
