import { Contract, JsonRpcProvider, type InterfaceAbi } from 'ethers';
import ERC20ABI from './abis/ERC20.json';
import ERC721ABI from './abis/ERC721.json';
import MulticallABI from './abis/Multicall.json';
import NonfungiblePositionManagerABI from './abis/NonfungiblePositionManager.json';
import AutoPositionManagerABI from './abis/AutoPositionManager.json';
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
  isProduction ? '0xaaea97033dfe8aebdd9d4ae9d5856678b8f7e127' : '0xdba7475F00deb72Bc80B16e8d742c86760c342fe',
  NonfungiblePositionManagerABI
);

export const AutoPositionManager = createContract(
  isProduction ? '0xB75AbE3Dafc47ac9C21d89f93EbA1A6669f63670' : '0xc3063f4a217d697Dbb68de456DBFDF4631E2e4DC',
  AutoPositionManagerABI
);

export const MulticallContract = createContract(isProduction ? '0x9f208d7226f05b4f43d0d36eb21d8545c3143685' : '0xd59149a01f910c3c448e41718134baeae55fa784', MulticallABI);

export const UniswapV3Factory = createContract(isProduction ? '0x50caddc77c6727bdd3c78b428c149bf110b4f595' : '0x3CA06Df0dA13841E03b6ee24d2aB62023De41b03', UniswapV3FactoryABI);

export const UniswapV3Quoter = createContract(isProduction ? '0x8e52aa02245134becdf3e0405a40ae04e151ed5c' : '0xEb6b81ABF107f25C765A71cA6bA0952BE5D43Fc4', UniswapV3QuoterABI);

export const UniswapV3SwapRouter = createContract(isProduction ? '0x3b02e356d09e758e2711bc64cf33e48f3e1239b8' : '0xdDAE0B2317505630854014ad0f9637d989073597', SwapRouterABI);

export const fetchMulticall = (data: string[][]): Promise<string[] | null> =>
  MulticallContract.func.aggregate.staticCall(data).then((res: any) => {
    const result = res?.[1];
    if (result) return Array.from(result);
    else return null;
  });

export const VotingEscrowContract = createContract(isProduction ? '0x8c08623a7b31520b3871a91f676e4c38080684a6' : '0x97DA4e2C169553D4dccB7ce7F0F2C7fA6AFEFD0c', VotingEscrowABI);

export const createPairContract = (poolAddress: string) => createContract(poolAddress, UniswapV3PairABI);
export const createPoolContract = (poolAddress: string) => createContract(poolAddress, UniswapV3PoolABI);
export const createERC20Contract = (tokenAddress: string) => createContract(tokenAddress, ERC20ABI);
export const createERC721Contract = (tokenAddress: string) => createContract(tokenAddress, ERC721ABI);
export const createVSTTokenContract = () => createERC20Contract(TokenVST.address);

export const UniswapV3Staker = createContract(isProduction ? '0x86e01175a5569c970cfb7a44e224120ddc85901a' : '0x74498b2642C29dA33D38a41693166B76346F505F', UniswapV3StakerABI);
