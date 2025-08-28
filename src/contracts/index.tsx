import { Contract, JsonRpcProvider, type InterfaceAbi } from 'ethers';
import ERC20ABI from './abis/ERC20.json';
import ERC721ABI from './abis/ERC721.json';
import MulticallABI from './abis/Multicall.json';
import NonfungiblePositionManagerABI from './abis/NonfungiblePositionManager.json';
import SwapRouterABI from './abis/SwapRouter.json';
import UniswapV3FactoryABI from './abis/UniswapV3Factory.json';
import UniswapV3QuoterABI from './abis/Quoter.json';
import UniswapV3PoolABI from './abis/UniswapV3PoolState.json';
import UniswapV3PairABI from './abis/UniswapV3Pool.json';
import VotingEscrowABI from './abis/VotingEscrow.json';
import { isProduction } from '@utils/is';
import { TokenVST } from '@service/tokens';
import UniswapV3StakerABI from './abis/UniswapV3Staker.json';

export const Provider = new JsonRpcProvider(import.meta.env.VITE_ESpaceRpcUrl);

const createContract = (address: string, ABI: InterfaceAbi) => {
  const _Contract = new Contract(address, ABI, Provider);
  return {
    func: _Contract,
    address,
  } as const;
};

export const NonfungiblePositionManager = createContract(
  isProduction ? '0x337daa3aed2d2c79c009a1de7feaddada10e70d3' : '0x337daa3aed2d2c79c009a1de7feaddada10e70d3',
  NonfungiblePositionManagerABI
);

export const MulticallContract = createContract(isProduction ? '0x9f208d7226f05b4f43d0d36eb21d8545c3143685' : '0xd59149a01f910c3c448e41718134baeae55fa784', MulticallABI);

export const UniswapV3Factory = createContract(isProduction ? '0xbd962b897233ea3c2322d45d97d2e8e42e4af974' : '0xbd962b897233ea3c2322d45d97d2e8e42e4af974', UniswapV3FactoryABI);

export const UniswapV3Quoter = createContract(isProduction ? '0x4561fb45b352f953545086ead2da5dea67420cef' : '0x4561fb45b352f953545086ead2da5dea67420cef', UniswapV3QuoterABI);

export const UniswapV3SwapRouter = createContract(isProduction ? '0xa11523550fe5718bd1961c74014adcf4c885601a' : '0xa11523550fe5718bd1961c74014adcf4c885601a', SwapRouterABI);

export const fetchMulticall = (data: string[][]): Promise<string[] | null> =>
  MulticallContract.func.aggregate.staticCall(data).then((res: any) => {
    const result = res?.[1];
    if (result) return Array.from(result);
    else return null;
  });

export const VotingEscrowContract = createContract(isProduction ? '0x461cd3356bed0c4f97623f91b7cceaa0688c68cc' : '0x461cd3356bed0c4f97623f91b7cceaa0688c68cc', VotingEscrowABI);

export const createPairContract = (poolAddress: string) => createContract(poolAddress, UniswapV3PairABI);
export const createPoolContract = (poolAddress: string) => createContract(poolAddress, UniswapV3PoolABI);
export const createERC20Contract = (tokenAddress: string) => createContract(tokenAddress, ERC20ABI);
export const createERC721Contract = (tokenAddress: string) => createContract(tokenAddress, ERC721ABI);
export const createVSTTokenContract = () => createERC20Contract(TokenVST.address);

export const UniswapV3Staker = createContract(isProduction ? '0xa9e9f952f2a5f695fa341ffced3cd5f4625c1fb0' : '0xa9e9f952f2a5f695fa341ffced3cd5f4625c1fb0', UniswapV3StakerABI);
