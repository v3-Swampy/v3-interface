import { useEffect, useState } from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Decimal from 'decimal.js';
import { fetchMulticall, createPairContract, VSTTokenContract, UniswapV3StakerFactory } from '@contracts/index';
import { chunk } from 'lodash-es';
import dayjs from 'dayjs';
import { getTokenByAddress, type Token } from '@service/tokens';
import { FeeAmount } from '@service/pairs&pool';
import { sendTransaction } from '@service/account';
import { poolIds, incentiveHistory, Incentive } from './farmingList';
import { useTokenPrice } from '@service/pairs&pool';
import { defaultAbiCoder } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/solidity';
import { FarmingPosition } from './myFarms';
import { selector, useRecoilValue } from 'recoil';

// get poolinfo list of pids
const poolsQuery = selector({
  key: `poolsQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    // get poolinfo list of pids
    const resOfMulticall: any = await fetchMulticall(
      poolIds.map((id) => [UniswapV3StakerFactory.address, UniswapV3StakerFactory.func.interface.encodeFunctionData('poolInfo', [id])])
    );

    let pools = resOfMulticall
      ? poolIds.map((pid, i) => {
          const r = UniswapV3StakerFactory.func.interface.decodeFunctionResult('poolInfo', resOfMulticall[i]);

          return {
            address: r[0], // pool address
            allocPoint: new Decimal(r[1].toString()).div(40).toString(), // pool allocPoint, divide by 40 to get the real multiplier
            pid,
          };
        })
      : [];

    return pools;
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
      rewardToken: VSTTokenContract.address,
      pool: address,
      startTime: startTime,
      endTime: endTime,
      refundee: '0xad085e56f5673fd994453bbcdfe6828aa659cb0d',
    };
  } else {
    const { startTime, endTime } = getCurrentIncentivePeriod();

    return {
      rewardToken: VSTTokenContract.address,
      pool: address,
      startTime: startTime,
      endTime: endTime,
      refundee: '0xad085e56f5673fd994453bbcdfe6828aa659cb0d',
    };
  }
};

export const usePoolList = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [poolList, setPoolList] = useState<any[]>([]);
  const price = useTokenPrice(VSTTokenContract.address) || 0;
  const poolInfos = useRecoilValue(poolsQuery);

  useEffect(() => {
    setLoading(true);

    async function main(pids: number[]) {
      try {
        let poolList = [];

        if (pids.length === 0) return;

        // initial pair contract
        const pairContracts = poolInfos.map((poolInfo) => createPairContract(poolInfo.address));

        // get pair info list
        const resOfMulticall2 = await fetchMulticall(
          pairContracts
            .map((pairContract) => {
              return [
                [pairContract.address, pairContract.func.interface.encodeFunctionData('token0')],
                [pairContract.address, pairContract.func.interface.encodeFunctionData('token1')],
                [pairContract.address, pairContract.func.interface.encodeFunctionData('fee')],
                [UniswapV3StakerFactory.address, UniswapV3StakerFactory.func.interface.encodeFunctionData('getPoolStat', [getIncentiveKey(pairContract.address)])],
                [UniswapV3StakerFactory.address, UniswapV3StakerFactory.func.interface.encodeFunctionData('totalAllocPoint')],
              ];
            })
            .flat()
        );

        const pairInfos = resOfMulticall2
          ? chunk(resOfMulticall2, 5).map((r, i) => {
              return {
                token0: pairContracts[i].func.interface.decodeFunctionResult('token0', r[0])[0],
                token1: pairContracts[i].func.interface.decodeFunctionResult('token1', r[1])[0],
                fee: pairContracts[i].func.interface.decodeFunctionResult('fee', r[2])[0].toString(),
                totalSupply: UniswapV3StakerFactory.func.interface.decodeFunctionResult('getPoolStat', r[3])[0].toString(),
                totalAllocPoint: UniswapV3StakerFactory.func.interface.decodeFunctionResult('totalAllocPoint', r[4])[0].toString(),
              };
            })
          : [];

        // merge pool info and pair info
        poolList = poolInfos.map((p, i) => {
          const { totalSupply, ...pairInfo } = pairInfos[i];
          const { token0, token1 } = pairInfo;

          const currentIncentivePeriod = getCurrentIncentivePeriod();

          /**
           * <reward rate per second> = incentive amount / (incentive endTime - incentive startTime)
           * APR lower bound = <reward rate per second> * UniswapV3Staker::poolInfo(pid).allocPoint / UniswapV3Staker::totalAllocPoint * <VST price in USD> / TVL * 31536000 * 33%
           * APR high  bound = <reward rate per second> * UniswapV3Staker::poolInfo(pid).allocPoint / UniswapV3Staker::totalAllocPoint * <VST price in USD> / TVL * 31536000
           */
          const rewardRatePerSecond = currentIncentivePeriod.amount / (currentIncentivePeriod.endTime - currentIncentivePeriod.startTime);
          const APRHigh = new Decimal(rewardRatePerSecond).mul(p.allocPoint).div(pairInfo.totalAllocPoint).mul(price).div(totalSupply).mul(31536000);
          const APRLow = APRHigh.mul(0.33);

          const tvl = new Decimal(price).mul(totalSupply).div(1e18).toFixed(2);

          return {
            ...p,
            ...pairInfo,
            token0: getTokenByAddress(token0) || DEFAULT_TOKEN,
            token1: getTokenByAddress(token1) || DEFAULT_TOKEN,
            tvl,
            range: [APRLow.toFixed(2), APRHigh.toFixed(2)],
            currentIncentivePeriod: getCurrentIncentivePeriod() as Incentive,
          };
        });

        setPoolList(poolList);
        setLoading(false);
      } catch (error) {
        setPoolList([]);
        setLoading(false);
      }
    }

    main(poolIds).catch(console.log);
  }, [poolIds.toString(), price]);

  return {
    loading,
    poolList,
  };
};

export const handleStakeLP = async ({ tokenId, address, startTime, endTime, pid }: { tokenId: number; address: string; startTime: number; endTime: number; pid: number }) => {
  const key = {
    rewardToken: VSTTokenContract.address,
    pool: address,
    startTime,
    endTime,
    refundee: '0xad085e56f5673fd994453bbcdfe6828aa659cb0d',
  };

  const data0 = UniswapV3StakerFactory.func.interface.encodeFunctionData('depositToken', [tokenId]);
  const data1 = UniswapV3StakerFactory.func.interface.encodeFunctionData('stakeToken', [key, tokenId, pid]);

  return await sendTransaction({
    to: UniswapV3StakerFactory.address,
    data: UniswapV3StakerFactory.func.interface.encodeFunctionData('multicall', [[data0, data1]]),
  });
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
