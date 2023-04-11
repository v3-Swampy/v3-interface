import { ContractFactory, JsonRpcProvider, type InterfaceAbi } from 'ethers';
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
import UniswapV3StakerABI from './abis/UniswapV3Staker.json';

const Provider = new JsonRpcProvider(import.meta.env.VITE_ESpaceRpcUrl);

const createContract = (address: string, ABI: InterfaceAbi) => {
  const _Contract = new ContractFactory(ABI, '', Provider);
  return {
    func: _Contract.interface,
    address,
  } as const;
};

export const NonfungiblePositionManager = createContract(
  isProduction ? '0x8ae50674593fff83a2967325fdaea6b34b456cc1' : '0x8ae50674593fff83a2967325fdaea6b34b456cc1',
  NonfungiblePositionManagerABI
);

export const UniswapV3Factory = createContract(isProduction ? '0xa5fa1005c10bbe414f4a9d56987e2c0ed0d48eea' : '0xa5fa1005c10bbe414f4a9d56987e2c0ed0d48eea', UniswapV3FactoryABI);

export const UniswapV3Quoter = createContract(isProduction ? '0x8094e129c8a5c9e8a4bf4fadc360f405175efa3f' : '0x8094e129c8a5c9e8a4bf4fadc360f405175efa3f', UniswapV3QuoterABI);

export const UniswapV3SwapRouter = createContract(isProduction ? '0xc15e15c0018cb1399b07e968c84fb347f6671048' : '0xc15e15c0018cb1399b07e968c84fb347f6671048', SwapRouterABI);

export const MulticallContract = createContract(isProduction ? '0x9f208d7226f05b4f43d0d36eb21d8545c3143685' : '0xd59149a01f910c3c448e41718134baeae55fa784', MulticallABI);

export const fetchMulticall = (data: string[][]): Promise<string[] | null> =>
  fetchChain<string>({
    params: [
      {
        data: MulticallContract.func.encodeFunctionData('aggregate', [data]),
        to: MulticallContract.address,
      },
      'latest',
    ],
  }).then((res) => {
    const decodeRes = MulticallContract.func.decodeFunctionResult('aggregate', res)?.[1];
    if (decodeRes) return Array.from(decodeRes);
    else return null;
  });

export const VotingEscrowContract = createContract(isProduction ? '0xd0f24c0acb48d051e43230afb43bdae5cf664cfa' : '0xd0f24c0acb48d051e43230afb43bdae5cf664cfa', VotingEscrowABI);

export const createPoolContract = (poolAddress: string) => createContract(poolAddress, UniswapV3PoolABI);
export const createERC20Contract = (tokenAddress: string) => createContract(tokenAddress, ERC20ABI);

export const VSTTokenContract = createERC20Contract(isProduction ? '0x147041fbdae3d3d3382103adcccd7bea34ef4c61' : '0x147041fbdae3d3d3382103adcccd7bea34ef4c61');

export const UniswapV3StakerFactory = createContract(
  isProduction ? '0x8bd3b14895b3578c3697246ea82484896763a9f3' : '0x8bd3b14895b3578c3697246ea82484896763a9f3',
  UniswapV3StakerABI
);
