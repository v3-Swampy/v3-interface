import { fetchMulticall, createPairContract, VSTTokenContract, UniswapV3StakerFactory } from '@contracts/index';
import Decimal from 'decimal.js';
import { useEffect, useState } from 'react';
import _ from 'lodash-es';
import dayjs from 'dayjs';
import { getTokenByAddress, type Token } from '@service/tokens';
import { FeeAmount } from '@service/pairs&pool';
import { sendTransaction, Unit } from '@cfxjs/use-wallet-react/ethereum';

// TODO need to be moved to farming config
const FAKED_PERIODS = [
  [1681447020, 1681490220],
  [1681490220, 1681533420],
  [1681533420, 1681576620],
  [1681576620, 1681619820],
  [1681619820, 1681663020],
  [1681663020, 1681706220],
  [1681706220, 1681749420],
  [1681749420, 1681792620],
  [1681792620, 1681835820],
  [1681835820, 1681879020],
  [1681879020, 1681922220],
  [1681922220, 1681965420],
  [1681965420, 1682008620],
  [1682008620, 1682051820],
  [1682051820, 1682095020],
  [1682095020, 1682138220],
  [1682138220, 1682181420],
  [1682181420, 1682224620],
  [1682224620, 1682267820],
  [1682267820, 1682311020],
  [1682311020, 1682354220],
  [1682354220, 1682397420],
  [1682397420, 1682440620],
  [1682440620, 1682483820],
  [1682483820, 1682527020],
  [1682527020, 1682570220],
  [1682570220, 1682613420],
  [1682613420, 1682656620],
  [1682656620, 1682699820],
  [1682699820, 1682743020],
  [1682743020, 1682786220],
  [1682786220, 1682829420],
  [1682829420, 1682872620],
  [1682872620, 1682915820],
  [1682915820, 1682959020],
  [1682959020, 1683002220],
] as [number, number][];

const DEFAULT_TOKEN = {
  name: '',
  symbol: '',
  decimals: 18,
  address: '',
  logoURI: '',
};

export interface PoolType {
  pid: number;
  address: string;
  allocPoint: string;
  token0: Token;
  token1: Token;
  fee: FeeAmount;
  range: [number, number];
  incentivePeriod: [number, number];
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
    const resOfMulticall: any = await fetchMulticall(
      pids.map((id) => [UniswapV3StakerFactory.address, UniswapV3StakerFactory.func.interface.encodeFunctionData('poolInfo', [id])])
    );

    let poolInfos = resOfMulticall
      ? pids.map((pid, i) => {
          const r = UniswapV3StakerFactory.func.interface.decodeFunctionResult('poolInfo', resOfMulticall[i]);

          return {
            address: r[0], // pool address
            allocPoint: new Decimal(r[1].toString()).div(40).toString(), // pool allocPoint, divide by 40 to get the real multiplier
            pid,
          };
        })
      : [];

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
          ];
        })
        .flat()
    );

    const pairInfos = resOfMulticall2
      ? _.chunk(resOfMulticall2, 4).map((r, i) => {
          return {
            token0: pairContracts[i].func.interface.decodeFunctionResult('token0', r[0])[0],
            token1: pairContracts[i].func.interface.decodeFunctionResult('token1', r[1])[0],
            fee: pairContracts[i].func.interface.decodeFunctionResult('fee', r[2])[0].toString(),
            totalSupply: UniswapV3StakerFactory.func.interface.decodeFunctionResult('getPoolStat', r[3])[0].toString(),
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
        incentivePeriod: getCurrentPeriod() as [number, number],
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

export const handleStakeLP = async ({ tokenId, address, startTime, endTime, pid }: { tokenId: number; address: string; startTime: number; endTime: number; pid: number }) => {
  const key = {
    rewardToken: VSTTokenContract.address,
    pool: address,
    startTime,
    endTime,
    refundee: '0xad085e56f5673fd994453bbcdfe6828aa659cb0d',
  };

  const data0 = UniswapV3StakerFactory.func.interface.encodeFunctionData('depositToken', [tokenId]);
  const data1 = UniswapV3StakerFactory.func.interface.encodeFunctionData('stakeToken', [key, address, pid]);

  const txHash = await sendTransaction({
    to: UniswapV3StakerFactory.address,
    data: UniswapV3StakerFactory.func.interface.encodeFunctionData('multicall', [[data0, data1]]),
  });

  console.log('handleStakeLP txHash: ', txHash);
};
