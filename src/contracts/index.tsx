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
  isProduction ? '0x8a5108b96144e7fc3c53bcfb55731d26b0181cd3' : '0x8a5108b96144e7fc3c53bcfb55731d26b0181cd3',
  NonfungiblePositionManagerABI
);

export const UniswapV3Factory = createContract(isProduction ? '0x459c4a9452b4f85c0ec704dba44afe4ba6c871ff' : '0x459c4a9452b4f85c0ec704dba44afe4ba6c871ff', UniswapV3FactoryABI);

export const UniswapV3Quoter = createContract(isProduction ? '0xd0f830cf49497534b9a645b64fffb0e2deb2fdec' : '0xd0f830cf49497534b9a645b64fffb0e2deb2fdec', UniswapV3QuoterABI);

export const UniswapV3SwapRouter = createContract(isProduction ? '0x476871c240ad1c15d0d48b66dd8e2643b7e27adb' : '0x476871c240ad1c15d0d48b66dd8e2643b7e27adb', SwapRouterABI);

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

export const VotingEscrowContract = createContract(isProduction ? '0xf270e44105c1270bc7a4ffedbcb699486ada7a6a' : '0xb2459c6445fe94cc2d2d2aff9ffc70157f77c649', VotingEscrowABI);

export const createPoolContract = (poolAddress: string) => createContract(poolAddress, UniswapV3PoolABI);
export const createERC20Contract = (tokenAddress: string) => createContract(tokenAddress, ERC20ABI);

export const VSTTokenContract=createERC20Contract(isProduction ? '0x22f41abf77905f50df398f21213290597e7414dd' : '0x49916ba65d0048c4bbb0a786a527d98d10a1cd2d')