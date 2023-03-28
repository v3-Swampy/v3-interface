import { ContractFactory, JsonRpcProvider, type InterfaceAbi } from 'ethers';
import ERC20ABI from './abis/ERC20.json';
import Multicall from './abis/Multicall.json';
import NonfungiblePositionManagerABI from './abis/NonfungiblePositionManager.json';
import SwapRouterABI from './abis/SwapRouter.json';
import UniswapV3FactoryABI from './abis/UniswapV3Factory.json';
import UniswapV3PoolABI from './abis/UniswapV3Pool.json';
import { isProduction } from '@utils/is';

const createContract = (address: string, ABI: InterfaceAbi) => {
  const _Contract = new ContractFactory(ABI, '', new JsonRpcProvider(import.meta.env.VITE_ESpaceRpcUrl));
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

export const MulticallContract = createContract(isProduction ? '0xd59149a01f910c3c448e41718134baeae55fa784' : '0x9f208d7226f05b4f43d0d36eb21d8545c3143685', Multicall);

export const createERC20Contract = (tokenAddress: string) => createContract(tokenAddress, ERC20ABI);