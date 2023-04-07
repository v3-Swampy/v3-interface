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

const Provider = new JsonRpcProvider(import.meta.env.VITE_ESpaceRpcUrl);

const createContract = (address: string, ABI: InterfaceAbi) => {
  const _Contract = new ContractFactory(ABI, '', Provider);
  return {
    func: _Contract.interface,
    address,
  } as const;
};

export const NonfungiblePositionManager = createContract(
  isProduction ? '0x0b52f6678193aa5a4939b8f2ebb479e291d85f0f' : '0x0b52f6678193aa5a4939b8f2ebb479e291d85f0f',
  NonfungiblePositionManagerABI
);

export const UniswapV3Factory = createContract(isProduction ? '0x1a1ca1c3c7f30d09110a2ff3a6a29301605d7c50' : '0x1a1ca1c3c7f30d09110a2ff3a6a29301605d7c50', UniswapV3FactoryABI);

export const UniswapV3Quoter = createContract(isProduction ? '0xd3b18426e516f570233c022408795a59ff18cb93' : '0xd3b18426e516f570233c022408795a59ff18cb93', UniswapV3QuoterABI);

export const UniswapV3SwapRouter = createContract(isProduction ? '0xbff67ee63ecce5b6265c794c42a0f6be0288fcd2' : '0xbff67ee63ecce5b6265c794c42a0f6be0288fcd2', SwapRouterABI);

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
  }).then(res => {
    const decodeRes = MulticallContract.func.decodeFunctionResult('aggregate', res)?.[1];
    if (decodeRes) return Array.from(decodeRes);
    else return null;
  });

export const VotingEscrowContract = createContract(isProduction ? '0x40f5276e4747835e394ce53d65d1aa7b63151adc' : '0x40f5276e4747835e394ce53d65d1aa7b63151adc', VotingEscrowABI);

export const createPoolContract = (poolAddress: string) => createContract(poolAddress, UniswapV3PoolABI);
export const createERC20Contract = (tokenAddress: string) => createContract(tokenAddress, ERC20ABI);

export const VSTTokenContract=createERC20Contract(isProduction ? '0x757fb802dc967e5372fa1b214ce2877907cc59cf' : '0x757fb802dc967e5372fa1b214ce2877907cc59cf')