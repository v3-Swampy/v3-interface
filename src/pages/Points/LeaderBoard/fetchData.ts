import { useMemo, useState, useEffect } from 'react';
import { useAccount } from '@service/account';
export interface UserData {
  account: string | undefined;
  wPoints: number | undefined;
  fPoints: number | undefined;
  isMy?: boolean;
  ranking?: number;
}

export interface PoolData {
  address: string;
  token0Address: string;
  token1Address: string;
  wPoints: number;
  fPoints: number;
  tvl: number;
}

const fetchUserData = async (limit: number = 100, sortField: string = 'trade'): Promise<UserData[]> => {
  try {
    const response = await fetch(`https://anchorxonlineportaldevnet.bimwallet.io/points/api/users?limit=${limit}&sortField=${sortField}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const json = await response.json();
    const data = json.data.items;
    return data.map((user: any) => ({
      account: user.address,
      wPoints: user.tradePoints,
      fPoints: user.liquidityPoints,
    }));
  } catch (error) {
    console.error('Error fetching user data:', error);
    return [];
  }
};

const fetchPools = async (limit: number = 100): Promise<PoolData[]> => {
  try {
    const response = await fetch(`https://anchorxonlineportaldevnet.bimwallet.io/points/api/pools?limit=${limit}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const json = await response.json();
    const data = json.data.items;
    return data.map((pool: any) => ({
      address: pool.address,
      wPoints: pool.tradeWeight,
      fPoints: pool.liquidityWeight,
      tvl: pool.tvl,
      token0Address: pool.token0,
      token1Address: pool.token1,
    }));
  } catch (error) {
    console.error('Error fetching pool data:', error);
    return [];
  }
}


export const useUserData = (limit: number, sortField: string): UserData[] => {
  const account = useAccount();
  const [userData, setUserData] = useState<UserData[]>([]);

  useEffect(() => {
    fetchUserData(limit, sortField).then(setUserData);
  }, []);

  const data = useMemo(() => {
    const sortedRankData = userData?.map((item, index) => ({ ...item, ranking: index + 1 }));
    if (!account) {
      return [{ account: undefined, wPoints: undefined, fPoints: undefined, isMy: true }, ...sortedRankData];
    }
    const existingUser = sortedRankData.find((user) => user.account?.toLowerCase() === account.toLowerCase());
    if (existingUser) {
      return [{ ...existingUser, isMy: true }, ...sortedRankData.filter((user) => user.account?.toLowerCase() !== account.toLowerCase())];
    }
    return [{ account, wPoints: undefined, fPoints: undefined, isMy: true }, ...sortedRankData];
  }, [account, userData]);


  return data;
};

export const usePoolData = (limit: number): PoolData[] => {
  const [poolData, setPoolData] = useState<PoolData[]>([]);

  useEffect(() => {
    fetchPools(limit).then(setPoolData);
  }, []);

  return poolData;
};
