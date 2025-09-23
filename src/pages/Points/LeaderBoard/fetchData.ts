import { useMemo,useState, useEffect } from 'react';
import { useAccount } from '@service/account';
interface UserData {
  account: string | undefined;
  wPoints: number | undefined;
  fPoints: number | undefined;
  isMy?: boolean;
  ranking?: number;
}

export const fetchUserData = async (limit: number = 100, sortField: string = 'trade'): Promise<UserData[]> => {
  try {
    const response = await fetch(`http://47.83.194.10:12346/api/users?limit=${limit}&sortField=${sortField}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const json = await response.json();
    const data = json.data.items;
    console.log('Fetched user data:', data);
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
