import { fetchMulticall, createPairContract, VSTTokenContract, UniswapV3StakerFactory } from '@contracts/index';
import Decimal from 'decimal.js';
import { useEffect, useState } from 'react';
import _ from 'lodash-es';
import dayjs from 'dayjs';
import { getTokenByAddress, type Token } from '@service/tokens';

const FAKED_PERIODS = [
  [1681084680, 1681171080],
  [1681171080, 1681257480],
  [1681257480, 1681343880],
  [1681343880, 1681430280],
] as [number, number][];

const DEFAULT_TOKEN = {
  name: '',
  symbol: '',
  decimals: 18,
  address: '',
  logoURI: '',
};

export interface PoolType {
  address: string;
  allocPoint: string;
  token0: Token;
  token1: Token;
  fee: string;
  range: [number, number];
  incentivePeriod: [number, number] | [];
  tvl: string;
}

const getCurrentPeriod = (now?: number): [number, number] | [] => {
  const n = now ? +dayjs(now) : dayjs().unix();
  const currentPeriod = FAKED_PERIODS.find((period) => n >= period[0] && n <= period[1]) || [];
  return currentPeriod;
};

const getIncentiveKey = (address: string, startTime?: number, endTime?: number) => {
  if (startTime && endTime) {
    return {
      rewardToken: VSTTokenContract.address,
      pool: address,
      startTime: startTime,
      endTime: endTime,
      refundee: '0xad085e56f5673fd994453bbcdfe6828aa659cb0d',
    };
  } else {
    const [startTime, endTime] = getCurrentPeriod();

    return {
      rewardToken: VSTTokenContract.address,
      pool: address,
      startTime: startTime,
      endTime: endTime,
      refundee: '0xad085e56f5673fd994453bbcdfe6828aa659cb0d',
    };
  }
};

export const getPoolList = async (pids: number[]): Promise<PoolType[]> => {
  try {
    if (pids.length === 0) {
      return [];
    }

    // get poolinfo list of pids
    const resOfMulticall: any = await fetchMulticall(pids.map((id) => [UniswapV3StakerFactory.address, UniswapV3StakerFactory.func.interface.encodeFunctionData('poolInfo', [id])]));

    let poolInfos = resOfMulticall
      ? pids.map((_, i) => {
          const r = UniswapV3StakerFactory.func.decodeFunctionResult('poolInfo', resOfMulticall[i]);
          return {
            address: r[0], // pool address
            allocPoint: new Decimal(r[1].toString()).div(40).toString(), // pool allocPoint, divide by 40 to get the real multiplier
          };
        })
      : [];

    // initial pair contract
    const pairContracts = poolInfos.map((poolInfo) => createPairContract(poolInfo.address));

    // get pair info list
    const resOfMulticall2 = await fetchMulticall(
      pairContracts
        .map((pairContract) => {
          // const incentiveId = keccak256(defaultAbiCoder.encode(getIncentiveKey(pairContract.address)));
          return [
            [pairContract.address, pairContract.func.encodeFunctionData('token0')],
            [pairContract.address, pairContract.func.encodeFunctionData('token1')],
            [pairContract.address, pairContract.func.encodeFunctionData('fee')],
            [UniswapV3StakerFactory.address, UniswapV3StakerFactory.func.encodeFunctionData('getPoolStat', [getIncentiveKey(pairContract.address)])],
          ];
        })
        .flat()
    );

    const pairInfos = resOfMulticall2
      ? _.chunk(resOfMulticall2, 4).map((r, i) => {
          return {
            token0: pairContracts[i].func.decodeFunctionResult('token0', r[0])[0],
            token1: pairContracts[i].func.decodeFunctionResult('token1', r[1])[0],
            fee: pairContracts[i].func.decodeFunctionResult('fee', r[2])[0].toString(),
            totalSupply: UniswapV3StakerFactory.func.decodeFunctionResult('getPoolStat', r[3])[0].toString(),
          };
        })
      : [];

    // merge pool info and pair info
    return poolInfos.map((p, i) => {
      const { totalSupply, ...pairInfo } = pairInfos[i];
      const { token0, token1 } = pairInfo;

      return {
        ...p,
        ...pairInfo,
        token0: getTokenByAddress(token0) || DEFAULT_TOKEN,
        token1: getTokenByAddress(token1) || DEFAULT_TOKEN,
        tvl: totalSupply, // TODO need to use totalSupply of VST to calculate to USD
        range: [0, 0], // TODO need to get real range
        incentivePeriod: getCurrentPeriod(),
      };
    });
  } catch (error) {
    console.log('getPoolList error: ', error);
    return [];
  }
};

export const usePoolList = (pids: number[]) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [poolList, setPoolList] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    getPoolList(pids).then((res) => {
      setPoolList(res);
      setLoading(false);
    });
  }, [pids.toString()]);

  return {
    loading,
    poolList,
  };
};
