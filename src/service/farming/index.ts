import { fetchMulticall, createPairContract, VSTTokenContract, UniswapV3StakerFactory } from '@contracts/index';
import Decimal from 'decimal.js';
import { useEffect, useState } from 'react';
import _ from 'lodash-es';
import dayjs from 'dayjs';
import { getTokenByAddress, type Token } from '@service/tokens';
import { FeeAmount } from '@service/pairs&pool';
import { sendTransaction } from '@cfxjs/use-wallet-react/ethereum';
import { poolIds, incentiveHistory, Incentive } from './farmingList';

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

export const getPastHistory=(index?:number)=>{
  const i=index?index:getCurrentIncentiveIndex()
  const pastHistory=[]
  for (let y = 0; y <=i; y++) {
    pastHistory.push(incentiveHistory[y]);
  }
  return pastHistory
}

export const getPastIncentivesOfPool=(poolAddress?:string)=>{
  if(!poolAddress) return []
  const pastHistory=getPastHistory()
  return pastHistory.map((incentiveItem)=>getIncentiveKey(poolAddress,incentiveItem.startTime,incentiveItem.endTime))
}


 

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
            [UniswapV3StakerFactory.address, UniswapV3StakerFactory.func.interface.encodeFunctionData('totalAllocPoint')],
          ];
        })
        .flat()
    );

    const pairInfos = resOfMulticall2
      ? _.chunk(resOfMulticall2, 5).map((r, i) => {
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
    return poolInfos.map((p, i) => {
      const { totalSupply, ...pairInfo } = pairInfos[i];
      const { token0, token1 } = pairInfo;

      const currentIncentivePeriod = getCurrentIncentivePeriod();

      // TODO need to use real VST price
      const FAKE_VST_PRICE = 1;

      /**
       * <reward rate per second> = incentive amount / (incentive endTime - incentive startTime)
       * APR lower bound = <reward rate per second> * UniswapV3Staker::poolInfo(pid).allocPoint / UniswapV3Staker::totalAllocPoint * <VST price in USD> / TVL * 31536000 * 33%
       * APR high  bound = <reward rate per second> * UniswapV3Staker::poolInfo(pid).allocPoint / UniswapV3Staker::totalAllocPoint * <VST price in USD> / TVL * 31536000
       */
      const rewardRatePerSecond = currentIncentivePeriod.amount / (currentIncentivePeriod.endTime - currentIncentivePeriod.startTime);
      const APRHigh = new Decimal(rewardRatePerSecond).mul(p.allocPoint).div(pairInfo.totalAllocPoint).mul(FAKE_VST_PRICE).div(totalSupply).mul(31536000);
      const APRLow = APRHigh.mul(0.33);

      // TODO
      const tvl = new Decimal(FAKE_VST_PRICE).mul(totalSupply).div(1e18).toFixed(2);

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
  } catch (error) {
    console.log('getPoolList error: ', error);
    return [];
  }
};

export const usePoolList = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [poolList, setPoolList] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    getPoolList(poolIds).then((res) => {
      setPoolList(res);
      setLoading(false);
    });
  }, [poolIds.toString()]);

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
