import { fetchGraphql, fetchStakerGraphql } from '@utils/fetch';
import { getPoolsWithHourDataGQL } from '@utils/graphql/query/pools';
import { getPoolIncentivesGQL, getUserPositionIDsGQL } from '@utils/graphql/query/staker';

const ONE_HOUR = 60 * 60;

export const getPoolsWith24HoursData = async (ids?: string[]) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    // 获取当前时间已超出整点的秒数
    const extraSecond = now % ONE_HOUR;
    // 获取一天前的整点时间戳
    const start = now - 1 * ONE_HOUR - extraSecond;
    const res = await fetchGraphql({
      query: getPoolsWithHourDataGQL,
      variables: {
        where: {
          id_in: ids,
        },
        hourDataWhere: {
          periodStartUnix_gte: start,
        },
      },
    });
    // TODO: hide pools with no volume in 24h
    return res.data.pools ?? [] /* .filter((i) => i.poolHourData.length > 0 && i.poolHourData.every(h=>h.volumeUSD===0)) */;
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
