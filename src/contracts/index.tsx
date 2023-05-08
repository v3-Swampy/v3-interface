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
  isProduction ? '0xab4fa0d8a8dc3e2fb713a786248ce782bdae7111' : '0xab4fa0d8a8dc3e2fb713a786248ce782bdae7111',
  NonfungiblePositionManagerABI
);

export const MulticallContract = createContract(isProduction ? '0x9f208d7226f05b4f43d0d36eb21d8545c3143685' : '0xd59149a01f910c3c448e41718134baeae55fa784', MulticallABI);

export const UniswapV3Factory = createContract(isProduction ? '0x7b972b7302e16fc8838bd69bc49a19911b7887bb' : '0x7b972b7302e16fc8838bd69bc49a19911b7887bb', UniswapV3FactoryABI);

export const UniswapV3Quoter = createContract(isProduction ? '0xeb6775b690664d9c2238697c1e4c925f60f7bc60' : '0xeb6775b690664d9c2238697c1e4c925f60f7bc60', UniswapV3QuoterABI);

export const UniswapV3SwapRouter = createContract(isProduction ? '0x7d76b91d7e24be0088cab406ce2792a911914381' : '0x7d76b91d7e24be0088cab406ce2792a911914381', SwapRouterABI);

export const fetchMulticall = (data: string[][]): Promise<string[] | null> =>
  MulticallContract.func.aggregate.staticCall(data).then((res) => {
    const result = res?.[1];
    if (result) return Array.from(result);
    else return null;
  });

export const VotingEscrowContract = createContract(isProduction ? '0xae50576fd9110674994263e0313260c7e89c1143' : '0xae50576fd9110674994263e0313260c7e89c1143', VotingEscrowABI);

export const createPairContract = (poolAddress: string) => createContract(poolAddress, UniswapV3PairABI);
export const createPoolContract = (poolAddress: string) => createContract(poolAddress, UniswapV3PoolABI);
export const createERC20Contract = (tokenAddress: string) => createContract(tokenAddress, ERC20ABI);
export const createERC721Contract = (tokenAddress: string) => createContract(tokenAddress, ERC721ABI);
export const createVSTTokenContract = () => createERC20Contract(TokenVST.address);

export const UniswapV3Staker = createContract(isProduction ? '0x8a2b815d84da33e270d20cfb2eac26cfb55c1e38' : '0x8a2b815d84da33e270d20cfb2eac26cfb55c1e38', UniswapV3StakerABI);

export const RefudeeContractAddress = isProduction ? '0xad085e56f5673fd994453bbcdfe6828aa659cb0d' : '0xad085e56f5673fd994453bbcdfe6828aa659cb0d';
