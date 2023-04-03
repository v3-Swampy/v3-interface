import { ContractFactory, JsonRpcProvider, type InterfaceAbi } from 'ethers';
import ERC20ABI from './abis/ERC20.json';
import Multicall from './abis/Multicall.json';
import NonfungiblePositionManagerABI from './abis/NonfungiblePositionManager.json';
import SwapRouterABI from './abis/SwapRouter.json';
import UniswapV3FactoryABI from './abis/UniswapV3Factory.json';
import UniswapV3PoolABI from './abis/UniswapV3Pool.json';
import VotingEscrowABI from './abis/VotingEscrow.json';
import { isProduction } from '@utils/is';

const createContract = (address: string, ABI: InterfaceAbi) => {
  const _Contract = new ContractFactory(ABI, '', new JsonRpcProvider(import.meta.env.VITE_ESpaceRpcUrl));
  return {
    func: _Contract.interface,
    address,
  } as const;
};

export const NonfungiblePositionManager = createContract(
  isProduction ? '0x0bf349e17364c95538206fd69850457bd0fb6e3f' : '0x0bf349e17364c95538206fd69850457bd0fb6e3f',
  NonfungiblePositionManagerABI
);

//TODO double-check the contract address
export const UniswapV3Factory = createContract(isProduction ? '0xd1498be6f640308715ac1a95f630a9002105c0db' : '0xd1498be6f640308715ac1a95f630a9002105c0db', UniswapV3FactoryABI);

export const UniswapV3Quoter = createContract(isProduction ? '0x4be0921c85b0e3403be214a9c15f06ab657a0123' : '0x4be0921c85b0e3403be214a9c15f06ab657a0123', UniswapV3PoolABI);

export const SwapRouter = createContract(isProduction ? '0x97128d5505c38d6bc85a72b053f9e7606b008f47' : '0x97128d5505c38d6bc85a72b053f9e7606b008f47', SwapRouterABI);

export const MulticallContract = createContract(isProduction ? '0xd59149a01f910c3c448e41718134baeae55fa784' : '0x9f208d7226f05b4f43d0d36eb21d8545c3143685', Multicall);

export const VotingEscrowContract = createContract(isProduction ? '0xf270e44105c1270bc7a4ffedbcb699486ada7a6a' : '0xb2459c6445fe94cc2d2d2aff9ffc70157f77c649', VotingEscrowABI);

export const createERC20Contract = (tokenAddress: string) => createContract(tokenAddress, ERC20ABI);

export const VSTTokenContract=createERC20Contract(isProduction ? '0x22f41abf77905f50df398f21213290597e7414dd' : '0x49916ba65d0048c4bbb0a786a527d98d10a1cd2d')