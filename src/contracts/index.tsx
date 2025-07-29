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
  isProduction ? '0xcbcce633c8b8512af2f291dc8b04ad3d4be4b90f' : '0xcbcce633c8b8512af2f291dc8b04ad3d4be4b90f',
  NonfungiblePositionManagerABI
);

export const MulticallContract = createContract(isProduction ? '0x9f208d7226f05b4f43d0d36eb21d8545c3143685' : '0xd59149a01f910c3c448e41718134baeae55fa784', MulticallABI);

export const UniswapV3Factory = createContract(isProduction ? '0x22ed7ae8299dffc0bedebd7dd0640688e8ad5c3b' : '0x22ed7ae8299dffc0bedebd7dd0640688e8ad5c3b', UniswapV3FactoryABI);

export const UniswapV3Quoter = createContract(isProduction ? '0xabedcd052928192c3e224fc2cc886777c80e2495' : '0xabedcd052928192c3e224fc2cc886777c80e2495', UniswapV3QuoterABI);

export const UniswapV3SwapRouter = createContract(isProduction ? '0x94b740b0d9ebb151cc9848c5419627a5ec52d837' : '0x94b740b0d9ebb151cc9848c5419627a5ec52d837', SwapRouterABI);

export const fetchMulticall = (data: string[][], blockNumber?: string): Promise<string[] | null> => {

  const overrides: { blockTag?: string } = {};
  if (blockNumber) {
    overrides.blockTag = blockNumber;
  }

  return MulticallContract.func.aggregate.staticCall(data, overrides).then((res: any) => {
    const result = res?.[1];
    if (result) return Array.from(result);
    else return null;
  });
};

export const VotingEscrowContract = createContract(isProduction ? '0xaf891c87aea0b7ecc5e661e9672041dab062df45' : '0xaf891c87aea0b7ecc5e661e9672041dab062df45', VotingEscrowABI);

export const createPairContract = (poolAddress: string) => createContract(poolAddress, UniswapV3PairABI);
export const createPoolContract = (poolAddress: string) => createContract(poolAddress, UniswapV3PoolABI);
export const createERC20Contract = (tokenAddress: string) => createContract(tokenAddress, ERC20ABI);
export const createERC721Contract = (tokenAddress: string) => createContract(tokenAddress, ERC721ABI);
export const createVSTTokenContract = () => createERC20Contract(TokenVST.address);

export const UniswapV3Staker = createContract(isProduction ? '0xe92d98705b0023ee05eb954a0d4249f707bb4447' : '0xe92d98705b0023ee05eb954a0d4249f707bb4447', UniswapV3StakerABI);

export const RefundeeContractAddress = isProduction ? '0xad085e56f5673fd994453bbcdfe6828aa659cb0d' : '0xad085e56f5673fd994453bbcdfe6828aa659cb0d';
