import { gql } from '../__generated__';

export const getPoolsWithHourDataGQL = gql(/* GraphQL */ `
  query PoolsWithHourDataQuery($where: Pool_filter, $hourDataWhere: PoolHourData_filter) {
    pools(where: $where) {
      id
      poolHourData(where: $hourDataWhere) {
        volumeUSD
      }
    }
  }
`);
