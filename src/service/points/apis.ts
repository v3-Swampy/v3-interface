import { isProduction } from '@utils/is';
import { PoolData, UserData, UserDataResponse } from './types';

export const fetchUserPoints = async (address: string): Promise<UserData> => {
  try {
    const response = await fetch(isProduction ? `/points/api/user?address=${address}` : `https://anchorxonlineportaldevnet.bimwallet.io/points/api/user?address=${address}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const json = await response.json();
    if (json.code !== 0) {
      throw new Error('user address is not found');
    }
    const data = json.data;
    return {
      account: data.address,
      wPoints: data.tradePoints,
      fPoints: data.liquidityPoints,
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return {
      account: address,
      wPoints: undefined,
      fPoints: undefined,
    };
  }
};

export const fetchPointRank = async (limit: number = 100, sortField: string = 'trade'): Promise<UserDataResponse> => {
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
      data: data.map((user: any, index: number) => ({
        account: user.address,
        wPoints: user.tradePoints,
        fPoints: user.liquidityPoints,
        ranking: index + 1,
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

export const fetchPointPools = async (limit: number = 100): Promise<PoolData[]> => {
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
      fee: pool.fee,
    }));
  } catch (error) {
    console.error('Error fetching pool data:', error);
    return [];
  }
};
