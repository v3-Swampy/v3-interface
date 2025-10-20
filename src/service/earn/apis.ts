import { fetchGraphql, fetchStakerGraphql } from '@utils/fetch';
import { getPoolsLatestDayDataGQL } from '@utils/graphql/query/pools';
import { getUserDepositsGQL } from '@utils/graphql/query/staker';

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

/** example */
export const getUserDeposits = async (owner?: string) => {
  try {
    const res = await fetchStakerGraphql({
      query: getUserDepositsGQL,
      variables: {
        where: {
          owner,
        },
      },
    });
    return res.data.deposits ?? [];
  } catch (error) {
    console.log('getUserDeposits error', error);
    return [];
  }
};
