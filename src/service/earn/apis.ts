import { fetchGraphql, fetchStakerGraphql } from '@utils/fetch';
import { getPoolsLatestDayDataGQL } from '@utils/graphql/query/pools';
import { getPoolIncentivesGQL, getUserPositionIDsGQL } from '@utils/graphql/query/staker';

export const getPoolLatestDayDataByPools = async (ids?: string[]) => {
  try {
    const res = await fetchGraphql({
      query: getPoolsLatestDayDataGQL,
      variables: {
        where: {
          id_in: ids,
        },
      },
    });
    // TODO: hide pools with no volume in 24h
    return res.data.pools ?? [] /* .filter((i) => i.poolDayData.length > 0 && i.poolDayData[0].volumeUSD > 0) */;
  } catch (error) {
    console.log('getPoolLatestDayDataByPools error', error);
    return [];
  }
};

export const getUserPositionIDs = async (owner?: string) => {
  try {
    const res = await fetchStakerGraphql({
      query: getUserPositionIDsGQL,
      variables: {
        where: {
          owner,
          // false is out vswap managed position
          isManaged: true,
        },
      },
    });
    return (
      (res.data.managedPositions ?? [])
        // id in subgraph is string, convert to number
        .map((i) => Number(i.id))
        .filter((i) => !isNaN(i))
        // id in subgraph is string, query sort is invalid, so sort manually
        .sort((a, b) => b - a)
    );
  } catch (error) {
    console.log('getUserPositionIDs error', error);
    return [];
  }
};

export const getIncentivesByPools = async ({
  pools,
  currentTimestamp,
}: {
  pools?: string[];
  currentTimestamp?: number;
}): Promise<
  {
    pool: string;
    rewardToken: string;
  }[]
> => {
  try {
    const res = await fetchStakerGraphql({
      query: getPoolIncentivesGQL,
      variables: {
        where: {
          pool_in: pools,
          startTime_lt: currentTimestamp,
        },
      },
    });
    return res.data.incentives ?? [];
  } catch (error) {
    console.log('getIncentivesByPools error', error);
    return [];
  }
};
