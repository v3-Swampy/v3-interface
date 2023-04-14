import { ContractFactory, JsonRpcProvider, type InterfaceAbi, Contract } from 'ethers';
import ERC20ABI from './abis/ERC20.json';
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

const Provider = new JsonRpcProvider(import.meta.env.VITE_ESpaceRpcUrl);

const createContract = (address: string, ABI: InterfaceAbi) => {
  const _Contract = new Contract(address, ABI, Provider);
  return {
    func: _Contract,
    address,
    contract: _Contract,
  } as const;
};

export const NonfungiblePositionManager = createContract(
  isProduction ? '0xa6822774704f981f7c455ed22e369167676c8a98' : '0xa6822774704f981f7c455ed22e369167676c8a98',
  NonfungiblePositionManagerABI
);

export const MulticallContract = createContract(isProduction ? '0x9f208d7226f05b4f43d0d36eb21d8545c3143685' : '0xd59149a01f910c3c448e41718134baeae55fa784', MulticallABI);

export const UniswapV3Factory = createContract(isProduction ? '0x8f6858da6116cca95602d633aecc1f434f38bdb1' : '0x8f6858da6116cca95602d633aecc1f434f38bdb1', UniswapV3FactoryABI);

export const UniswapV3Quoter = createContract(isProduction ? '0xb8a18af48927b1e14ad36e4772fc461451ae0ac7' : '0xb8a18af48927b1e14ad36e4772fc461451ae0ac7', UniswapV3QuoterABI);

export const UniswapV3SwapRouter = createContract(isProduction ? '0x80b9429fbf2da772644a15215e75e5dd69e01dfe' : '0x80b9429fbf2da772644a15215e75e5dd69e01dfe', SwapRouterABI);

export const fetchMulticall = (data: string[][]): Promise<string[] | null> =>
  MulticallContract.func.aggregate.staticCall(data).then((res) => {
    const result = res?.[1];
    if (result) return Array.from(result);
    else return null;
  });

export const VotingEscrowContract = createContract(isProduction ? '0xfe13d132bcf66c0597166f564b1225c386d5af85' : '0xfe13d132bcf66c0597166f564b1225c386d5af85', VotingEscrowABI);

export const createPairContract = (poolAddress: string) => createContract(poolAddress, UniswapV3PairABI);
export const createPoolContract = (poolAddress: string) => createContract(poolAddress, UniswapV3PoolABI);
export const createERC20Contract = (tokenAddress: string) => createContract(tokenAddress, ERC20ABI);

export const VSTTokenContract = createERC20Contract(TokenVST.address);

export const UniswapV3StakerFactory = createContract(
  isProduction ? '0x9862833cee9fb15a8294222ba5a3e7e8445461c2' : '0x9862833cee9fb15a8294222ba5a3e7e8445461c2',
  UniswapV3StakerABI
);
