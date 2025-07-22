import { useEffect, useState } from 'react';
import { selector, useRecoilValue, useRecoilRefresher_UNSTABLE } from 'recoil';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Decimal from 'decimal.js';
import { fetchMulticall, createPairContract, UniswapV3Staker } from '@contracts/index';
import { chunk } from 'lodash-es';
import dayjs from 'dayjs';
import { getUnwrapperTokenByAddress, type Token, stableTokens, baseTokens, getTokenByAddress, fetchTokenInfoByAddress, addTokenToList, TokenVST } from '@service/tokens';
import { FeeAmount, fetchPools, calcAmountFromPrice } from '@service/pairs&pool';
import { sendTransaction } from '@service/account';
import { poolIdsSelector, currentIncentiveSelector, type Incentive, getIncentiveKey } from './farmingList';
import { defaultAbiCoder } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/solidity';
import { RefundeeContractAddress } from '@contracts/index';
import { hidePopup } from '@components/showPopup';
import showGasLimitModal from '@modules/ConfirmTransactionModal/showGasLimitModal';
import { FarmingPosition } from './myFarms';
export { getPastHistory, getCurrentIncentiveKey, getPastIncentivesOfPool, currentIncentiveSelector, type IncentiveKey, useCurrentIncentive } from './farmingList';


// get poolinfo list of pids  
export const pidAndAllocPointsQuery = selector({
  key: `pidAndAllocPointQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const poolIds = get(poolIdsSelector);
    try {
      const resOfMulticall: any = await fetchMulticall(poolIds.map((id) => [UniswapV3Staker.address, UniswapV3Staker.func.interface.encodeFunctionData('poolInfo', [id])]));
      const pidAndAllocPoints = resOfMulticall
        ? poolIds.map((pid, i) => {
          const r = UniswapV3Staker.func.interface.decodeFunctionResult('poolInfo', resOfMulticall[i]);
          const allocPoint = r[1].toString() as string;

          return {
            address: r[0] as string, // pool address
            multiplier: new Decimal(allocPoint).div(40).toString(),
            allocPoint, // pool allocPoint, divide by 40 to get the real multiplier
            pid,
          };
        })
        : [];

      return pidAndAllocPoints;
    } catch (error) {
      return [];
    }
  },
});

export interface PoolType {
  pid: number;
  address: string;
  allocPoint: string;
  token0: Token;
  token1: Token;
  fee: FeeAmount;
  range: readonly [string, string];
  currentIncentivePeriod: Incentive;
  tvl: string;
  leftToken: Token;
  rightToken: Token;
}


const poolsQuery = selector({
  key: `poolsQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const poolIds = get(poolIdsSelector);
    const pools = get(pidAndAllocPointsQuery);
    const currentIncentive = get(currentIncentiveSelector);

    if (poolIds.length === 0) return [];

    // initial pair contract
    const pairContracts = pools.map((pool) => createPairContract(pool.address));

    try {
      const resOfMulticall2 = await fetchMulticall(
        pairContracts
          .map((pairContract) => {
            return [
              [pairContract.address, pairContract.func.interface.encodeFunctionData('token0')],
              [pairContract.address, pairContract.func.interface.encodeFunctionData('token1')],
              [pairContract.address, pairContract.func.interface.encodeFunctionData('fee')],
              [UniswapV3Staker.address, UniswapV3Staker.func.interface.encodeFunctionData('poolStat', [computeIncentiveKey(getIncentiveKey(pairContract.address))])],
              [UniswapV3Staker.address, UniswapV3Staker.func.interface.encodeFunctionData('totalAllocPoint')],
            ];
          })
          .flat()
      );

      const pairsInfo = resOfMulticall2
        ? chunk(resOfMulticall2, 5).map((r, i) => {
          return {
            token0: pairContracts[i].func.interface.decodeFunctionResult('token0', r[0])[0],
            token1: pairContracts[i].func.interface.decodeFunctionResult('token1', r[1])[0],
            fee: pairContracts[i].func.interface.decodeFunctionResult('fee', r[2])[0].toString(),
            totalSupply: UniswapV3Staker.func.interface.decodeFunctionResult('poolStat', r[3])[0].toString(),
            totalAllocPoint: UniswapV3Staker.func.interface.decodeFunctionResult('totalAllocPoint', r[4])[0].toString(),
          };
        })
        : [];
      const tokenInfos = await Promise.all(
        pairsInfo?.map(async (info) => {
          let token0 = getTokenByAddress(info?.token0)!;
          let token1 = getTokenByAddress(info?.token1)!;
          if (!token0) {
            token0 = (await fetchTokenInfoByAddress(info?.token0))!;
            if (token0) addTokenToList(token0);
          }

          if (!token1) {
            token1 = (await fetchTokenInfoByAddress(info?.token1))!;
            if (token1) addTokenToList(token1);
          }
          return {
            token0,
            token1,
          };
        })
      );

      const poolsInfo = await fetchPools(tokenInfos.map(({ token0, token1 }, i) => ({ token0, token1, fee: pairsInfo[i].fee })));

      return pools.map((p, i) => {
        const { totalSupply, ...pairInfo } = pairsInfo[i];
        const { token0, token1 } = tokenInfos[i];
        const pool = poolsInfo[i];
        const [amount0, amount1] = pool?.token0Price && totalSupply && pool.tickCurrent ?
          calcAmountFromPrice({
            liquidity: totalSupply,
            lower: new Unit(1.0001).pow(new Unit(pool.tickCurrent - 2400)),
            current: pool.token0Price.mul(`1e${token1.decimals - token0.decimals}`),
            upper: new Unit(1.0001).pow(new Unit(pool.tickCurrent + 2400)),
          })
          : [undefined, undefined];
        const [leftToken, rightToken] = getLRToken(getTokenByAddress(token0.address), getTokenByAddress(token1.address));
        return {
          ...p,
          ...pairInfo,
          token0,
          token1,
          amount0,
          amount1,
          tvl: '',
          totalSupply,
          currentIncentivePeriod: currentIncentive?.period,
          leftToken,
          rightToken,
        };
      });
    } catch (error) {
      console.warn('error', error);
      return [];
    }
  },
});

export const useAllPools = () => useRecoilValue(poolsQuery);

export const useRefreshPoolsQuery = () => useRecoilRefresher_UNSTABLE(poolsQuery);

export const handleStakeLP = async ({ tokenId, address, startTime, endTime, pid }: { tokenId: number; address: string; startTime: number; endTime: number; pid: number }) => {
  try {
    const key = {
      rewardToken: TokenVST?.address,
      pool: address,
      startTime,
      endTime,
      refundee: RefundeeContractAddress,
    };

    const data0 = UniswapV3Staker.func.interface.encodeFunctionData('depositToken', [tokenId]);
    const data1 = UniswapV3Staker.func.interface.encodeFunctionData('stakeToken', [key, tokenId, pid]);

    return await sendTransaction({
      to: UniswapV3Staker.address,
      data: UniswapV3Staker.func.interface.encodeFunctionData('multicall', [[data0, data1]]),
    });
  } catch (err: any) {
    if (err?.code === -32603) {
      hidePopup();
      setTimeout(() => {
        showGasLimitModal();
      }, 400);
    }
  }
};

export const computeIncentiveKey = (incentiveKeyObject?: {}): string => {
  return keccak256(['bytes'], [defaultAbiCoder.encode(['tuple(address rewardToken,address pool,uint256 startTime,uint256 endTime,address refundee)'], [incentiveKeyObject])]);
};

export const getLiquility = (position: FarmingPosition, token0Price?: string | null, token1Price?: string | null) => {
  if (token0Price && token1Price && position.amount0 && position.amount1) {
    return position.amount0.mul(token0Price).add(position.amount1.mul(token1Price));
  }

  return new Unit(0);
};

export const getLRToken = (token0: Token | null, token1: Token | null) => {
  if (!token0 || !token1) return [];
  const unwrapToken0 = getUnwrapperTokenByAddress(token0.address);
  const unwrapToken1 = getUnwrapperTokenByAddress(token1.address);
  const checkedLR =
    // if token0 is a dollar-stable asset, set it as the quote token
    stableTokens.some((stableToken) => stableToken?.address === token0.address) ||
    // if token1 is an ETH-/BTC-stable asset, set it as the base token
    baseTokens.some((baseToken) => baseToken?.address === token1.address);
  const leftToken = checkedLR ? unwrapToken0 : unwrapToken1;
  const rightToken = checkedLR ? unwrapToken1 : unwrapToken0;
  return [leftToken, rightToken];
};

const claimStartTimeQuery = selector({
  key: `claimStartTime-${import.meta.env.MODE}`,
  get: async () => {
    const response = await UniswapV3Staker.func.unclaimableEndtime();
    return response ? Number(response) : dayjs().unix();
  },
});

export const useClaimStartTime = () => useRecoilValue(claimStartTimeQuery);
export const useCanClaim = () => {
  const claimStartTime = useClaimStartTime();
  const [canClaim, setCanClaim] = useState<boolean>(false);
  useEffect(() => {
    const fn = () => {
      const diff = dayjs(claimStartTime * 1000).diff(dayjs(), 'second');
      if (diff <= 0) {
        setCanClaim(true);
        clearInterval(intervalId);
      } else {
        setCanClaim(false);
      }
    };

    const intervalId = setInterval(fn, 1000);

    fn();

    return () => clearInterval(intervalId);
  }, [claimStartTime]);
  return canClaim;
};
