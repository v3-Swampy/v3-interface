import { useMemo, useState, useEffect } from 'react';
import { useAccount } from '@service/account';
import { isProduction } from '@utils/is';
export interface UserData {
  account: string | undefined;
  wPoints: number | undefined;
  fPoints: number | undefined;
  isMy?: boolean;
  ranking?: number;
}

interface UserDataResponse {
  data: UserData[];
  updatedAt: number;
}

export interface PoolData {
  address: string;
  token0Address: string;
  token1Address: string;
  wPoints: number;
  fPoints: number;
  tvl: number;
}

const fetchUserData = async (limit: number = 100, sortField: string = 'trade'): Promise<UserDataResponse> => {
  try {
    const response = await fetch(
      isProduction
        ? `/points/api/users?limit=${limit}&sortField=${sortField}`
        : `https://anchorxonlineportaldevnet.bimwallet.io/points/api/users?limit=${limit}&sortField=${sortField}`
    );
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const json = await response.json();
    const data = json.data.items;
    const updatedAt = json.data.updatedAt;
    console.log('Data last updated at:', new Date(updatedAt * 1000).toLocaleString());
    return {
      data: data.map((user: any) => ({
        account: user.address,
        wPoints: user.tradePoints,
        fPoints: user.liquidityPoints,
      })),
      updatedAt,
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return {
      data: [],
      updatedAt: 0,
    };
  }
};

const fetchPools = async (limit: number = 100): Promise<PoolData[]> => {
  try {
    const response = await fetch(isProduction ? `/points/api/pools?limit=${limit}` : `https://anchorxonlineportaldevnet.bimwallet.io/points/api/pools?limit=${limit}`);
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
};

export const useUserData = (limit: number, sortField: string): UserDataResponse => {
  const account = useAccount();
  const [userData, setUserData] = useState<UserData[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number>(0);

  useEffect(() => {
    fetchUserData(limit, sortField).then((res) => {
      setUserData(res.data);
      setUpdatedAt(res.updatedAt);
    });
  }, []);

  const data = useMemo(() => {
    if (!userData?.length && !account) {
      return [];
    }
    const sortedRankData = userData?.map((item, index) => ({ ...item, ranking: index + 1 }));
    if (!account) {
      return [{ account: undefined, wPoints: undefined, fPoints: undefined, isMy: true }, ...(sortedRankData ?? [])];
    }
    const existingUser = sortedRankData?.find((user) => user.account?.toLowerCase() === account.toLowerCase());
    if (existingUser) {
      return [{ ...existingUser, isMy: true }, ...(sortedRankData?.filter((user) => user.account?.toLowerCase() !== account.toLowerCase()) ?? [])];
    }
    return [{ account, wPoints: undefined, fPoints: undefined, isMy: true }, ...(sortedRankData ?? [])];
  }, [account, userData]);

  return { data, updatedAt };
};

export const usePoolData = (limit: number): PoolData[] => {
  const [poolData, setPoolData] = useState<PoolData[]>([]);

  useEffect(() => {
    fetchPools(limit).then(setPoolData);
  }, []);

  return poolData;
};
