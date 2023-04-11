import { UniswapV3StakerFactory } from '@contracts/index';
import { fetchMulticall } from '@contracts/index';
import Decimal from 'decimal.js';
import { useEffect, useState } from 'react';

export const getPoolList = async (pids: number[]) => {
  try {
    if (pids.length === 0) {
      return [];
    }
    // @ts-ignore
    return await fetchMulticall(pids.map((id) => [UniswapV3StakerFactory.address, UniswapV3StakerFactory.func.encodeFunctionData('poolInfo', [id])])).then((res) => {
      return res
        ? pids.map((_, i) => {
            const r = UniswapV3StakerFactory.func.decodeFunctionResult('poolInfo', res[i]);
            return {
              address: r[0], // pool address
              allocPoint: new Decimal(r[1].toString()).div(40).toNumber(), // pool allocPoint, divide by 40 to get the real multiplier
            };
          })
        : [];
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
