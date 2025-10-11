import { useMemo } from 'react';
import { selector, useRecoilValue, selectorFamily } from 'recoil';
import { accountState } from '@service/account';
import { fetchPointPools, fetchPointRank, fetchUserPoints } from './apis';

export * from './types';

const userPointsQuery = selector({
  key: `userPointsQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);
    if (!account) return undefined;
    return await fetchUserPoints(account);
  },
});

const pointRankQuery = selectorFamily({
  key: `pointRankQuery-${import.meta.env.MODE}`,
  get: (pointRankParams: { limit: number; sortField: string }) => async () => {
    return await fetchPointRank(pointRankParams.limit, pointRankParams.sortField);
  },
});

const pointPoolsQuery = selectorFamily({
  key: `pointPoolsQuery-${import.meta.env.MODE}`,
  get: (limit: number) => async () => {
    return await fetchPointPools(limit);
  },
});

export const usePointRank = (limit: number, sortField: string) =>
  useRecoilValue(
    pointRankQuery({
      limit,
      sortField,
    })
  );
export const useUserRank = (limit: number, sortField: string) => {
  const rank = usePointRank(limit, sortField);
  const _userPoint = useRecoilValue(userPointsQuery);
  const userPointWithRank = useMemo(() => {
    if (!_userPoint) return undefined;
    const userRank = rank.data?.find((i) => i.account?.toLowerCase() === _userPoint.account?.toLowerCase());
    return {
      ..._userPoint,
      ranking: userRank?.ranking,
    };
  }, [_userPoint, rank]);
  return userPointWithRank;
};
export const usePointPools = (limit: number) => useRecoilValue(pointPoolsQuery(limit));
