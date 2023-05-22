import { useEffect, useState } from 'react';
import { selector, useRecoilValue, atom, useRecoilRefresher_UNSTABLE } from 'recoil';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Decimal from 'decimal.js';
import { fetchMulticall, createPairContract, UniswapV3Staker } from '@contracts/index';
import { chunk } from 'lodash-es';
import dayjs from 'dayjs';
import { getUnwrapperTokenByAddress, type Token, stableTokens, baseTokens, getTokenByAddress, fetchTokenInfoByAddress, addTokenToList, TokenVST } from '@service/tokens';
import { FeeAmount } from '@service/pairs&pool';
import { sendTransaction } from '@service/account';
import { poolIds, incentiveHistory, Incentive } from './farmingList';
import { useTokenPrice } from '@service/pairs&pool';
import { defaultAbiCoder } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/solidity';
import { RefudeeContractAddress } from '@contracts/index';
import { hidePopup } from '@components/showPopup';
import showGasLimitModal from '@modules/ConfirmTransactionModal/showGasLimitModal';
import { FarmingPosition } from './myFarms';

const poolIdsQuery = atom({
  key: `poolIdsQuery-${import.meta.env.MODE}`,
  default: poolIds,
});

// get poolinfo list of pids
export const poolsInfoQuery = selector({
  key: `poolsInfoQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const poolIds = get(poolIdsQuery);
    // get poolinfo list of pids
    try {
      const resOfMulticall: any = await fetchMulticall(poolIds.map((id) => [UniswapV3Staker.address, UniswapV3Staker.func.interface.encodeFunctionData('poolInfo', [id])]));
      let pools = resOfMulticall
        ? poolIds.map((pid, i) => {
            const r = UniswapV3Staker.func.interface.decodeFunctionResult('poolInfo', resOfMulticall[i]);

            return {
              address: r[0], // pool address
              allocPoint: new Decimal(r[1].toString()).div(40).toString(), // pool allocPoint, divide by 40 to get the real multiplier
              pid,
            };
          })
        : [];

      return pools;
    } catch (error) {
      return [];
    }
  },
});

const DEFAULT_TOKEN = {
  name: '',
  symbol: '',
  decimals: 18,
  address: '',
  logoURI: '',
};

export interface IncentiveKey {
  rewardToken: string;
  pool: string;
  startTime: number;
  endTime: number;
  refundee: string;
}

export interface PoolType {
  pid: number;
  address: string;
  allocPoint: string;
  token0: Token;
  token1: Token;
  fee: FeeAmount;
  range: [string, string];
  currentIncentivePeriod: Incentive;
  tvl: string;
  leftToken: Token;
  rightToken: Token;
}

export const getCurrentIncentivePeriod = (now?: number): Incentive => {
  return incentiveHistory[getCurrentIncentiveIndex(now)];
};

export const getCurrentIncentiveIndex = (now?: number): number => {
  const n = now ? +dayjs(now) : dayjs().unix();
  const index = incentiveHistory.findIndex((period) => n >= period.startTime && n <= period.endTime);
  return index;
};

export const getPastHistory = (index?: number) => {
  const i = index ? index : getCurrentIncentiveIndex();
  const pastHistory = [];
  for (let y = 0; y <= i; y++) {
    pastHistory.push(incentiveHistory[y]);
  }
  return pastHistory;
};

export const getCurrentIncentiveKey = (poolAddress: string): IncentiveKey => {
  const currentIncentive = getCurrentIncentivePeriod();
  return getIncentiveKey(poolAddress, currentIncentive.startTime, currentIncentive.endTime);
};

export const getPastIncentivesOfPool = (poolAddress?: string) => {
  if (!poolAddress) return [];
  const pastHistory = getPastHistory();
  return pastHistory.map((incentiveItem) => getIncentiveKey(poolAddress, incentiveItem.startTime, incentiveItem.endTime));
};

const getIncentiveKey = (address: string, startTime?: number, endTime?: number): IncentiveKey => {
  if (startTime && endTime) {
    return {
      rewardToken: TokenVST?.address,
      pool: address,
      startTime: startTime,
      endTime: endTime,
      refundee: RefudeeContractAddress,
    };
  } else {
    const { startTime, endTime } = getCurrentIncentivePeriod();

    return {
      rewardToken: TokenVST?.address,
      pool: address,
      startTime: startTime,
      endTime: endTime,
      refundee: RefudeeContractAddress,
    };
  }
};

const poolsQuery = selector({
  key: `poolsQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const poolIds = get(poolIdsQuery);
    const poolsInfo = get(poolsInfoQuery);

    if (poolIds.length === 0) return [];

    // initial pair contract
    const pairContracts = poolsInfo.map((poolInfo) => createPairContract(poolInfo.address));

    try {
      // get pair info list
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

      // merge pool info and pair info
      return poolsInfo.map((p, i) => {
        const { totalSupply, ...pairInfo } = pairsInfo[i];
        const { token0, token1 } = pairInfo;
        const [leftToken, rightToken] = getLRToken(getTokenByAddress(token0), getTokenByAddress(token1));
        return {
          ...p,
          ...pairInfo,
          token0: tokenInfos[i]?.token0,
          token1: tokenInfos[i]?.token1,
          tvl: 0,
          range: [],
          totalSupply,
          currentIncentivePeriod: getCurrentIncentivePeriod(),
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

export const usePoolsQuery = () => {
  const pools = useRecoilValue(poolsQuery);
  const price = useTokenPrice(TokenVST.address) || 0;

  if (!price) return pools;

  return pools.map((p) => {
    const { totalSupply, totalAllocPoint } = p;
    const currentIncentivePeriod = getCurrentIncentivePeriod();
    let APRRange: [string, string] | [] = [];

    if (price) {
      /**
       * <reward rate per second> = incentive amount / (incentive endTime - incentive startTime)
       * APR lower bound = <reward rate per second> * UniswapV3Staker::poolInfo(pid).allocPoint / UniswapV3Staker::totalAllocPoint * <VST price in USD> / TVL * 31536000 * 33%
       * APR high  bound = <reward rate per second> * UniswapV3Staker::poolInfo(pid).allocPoint / UniswapV3Staker::totalAllocPoint * <VST price in USD> / TVL * 31536000
       */
      const rewardRatePerSecond = currentIncentivePeriod.amount / (currentIncentivePeriod.endTime - currentIncentivePeriod.startTime);
      const APRHigh = new Decimal(rewardRatePerSecond).mul(p.allocPoint).div(totalAllocPoint).mul(price).div(totalSupply).mul(31536000);
      const APRLow = APRHigh.mul(0.33);

      APRRange = [APRLow.toFixed(2), APRHigh.toFixed(2)];
    }

    const tvl = new Decimal(price).mul(totalSupply).div(1e18).toFixed(2);

    return {
      ...p,
      tvl,
      range: APRRange,
    };
  });
};

export const useRefreshPoolsQuery = () => useRecoilRefresher_UNSTABLE(poolsQuery);

export const handleStakeLP = async ({ tokenId, address, startTime, endTime, pid }: { tokenId: number; address: string; startTime: number; endTime: number; pid: number }) => {
  try {
    const key = {
      rewardToken: TokenVST?.address,
      pool: address,
      startTime,
      endTime,
      refundee: RefudeeContractAddress,
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

export const geLiquility = (position: FarmingPosition, token0Price?: string | null, token1Price?: string | null) => {
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
