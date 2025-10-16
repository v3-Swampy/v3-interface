import { fetchGraphql } from '@utils/fetch';
import { getPoolsLatestDayDataGQL } from '@utils/graphql/query/pools';

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
