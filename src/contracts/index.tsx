import { ContractFactory, JsonRpcProvider, type InterfaceAbi, Contract } from 'ethers';
import ERC20ABI from './abis/ERC20.json';
import MulticallABI from './abis/Multicall.json';
import NonfungiblePositionManagerABI from './abis/NonfungiblePositionManager.json';
import SwapRouterABI from './abis/SwapRouter.json';
import UniswapV3FactoryABI from './abis/UniswapV3Factory.json';
import UniswapV3QuoterABI from './abis/Quoter.json';
import UniswapV3PoolABI from './abis/UniswapV3PoolState.json';
import VotingEscrowABI from './abis/VotingEscrow.json';
import { isProduction } from '@utils/is';
import { fetchChain } from '@utils/fetch';
import { TokenVST } from '@service/tokens';

const Provider = new JsonRpcProvider(import.meta.env.VITE_ESpaceRpcUrl);

const createContract = (address: string, ABI: InterfaceAbi) => {
  const _Contract = new Contract(address, ABI, Provider);
  return {
    func: _Contract,
    address,
  } as const;
};

export const NonfungiblePositionManager = createContract(
  isProduction ? '0x8ae50674593fff83a2967325fdaea6b34b456cc1' : '0x8ae50674593fff83a2967325fdaea6b34b456cc1',
  NonfungiblePositionManagerABI
);

export const MulticallContract = createContract(isProduction ? '0x9f208d7226f05b4f43d0d36eb21d8545c3143685' : '0xd59149a01f910c3c448e41718134baeae55fa784', MulticallABI);

export const UniswapV3Factory = createContract(isProduction ? '0xa5fa1005c10bbe414f4a9d56987e2c0ed0d48eea' : '0xa5fa1005c10bbe414f4a9d56987e2c0ed0d48eea', UniswapV3FactoryABI);

export const UniswapV3Quoter = createContract(isProduction ? '0xd3b18426e516f570233c022408795a59ff18cb93' : '0xd3b18426e516f570233c022408795a59ff18cb93', UniswapV3QuoterABI);

export const UniswapV3SwapRouter = createContract(isProduction ? '0x8094e129c8a5c9e8a4bf4fadc360f405175efa3f' : '0x8094e129c8a5c9e8a4bf4fadc360f405175efa3f', SwapRouterABI);

export const fetchMulticall = (data: string[][]): Promise<string[] | null> =>
  MulticallContract.func.aggregate.staticCall(data).then((res) => {
    const result = res?.[1];
    if (result) return Array.from(result);
    else return null;
  });

export const VotingEscrowContract = createContract(isProduction ? '0xd0f24c0acb48d051e43230afb43bdae5cf664cfa' : '0xd0f24c0acb48d051e43230afb43bdae5cf664cfa', VotingEscrowABI);

export const createPoolContract = (poolAddress: string) => createContract(poolAddress, UniswapV3PoolABI);
export const createERC20Contract = (tokenAddress: string) => createContract(tokenAddress, ERC20ABI);

export const VSTTokenContract = createERC20Contract(TokenVST.address);
