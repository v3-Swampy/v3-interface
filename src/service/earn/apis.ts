import { fetchGraphql, fetchStakerGraphql } from '@utils/fetch';
import { getPoolsLatestDayDataGQL } from '@utils/graphql/query/pools';
import { getUserPositionIDsGQL } from '@utils/graphql/query/staker';

/** example */
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
    return res.data.pools ?? [];
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
