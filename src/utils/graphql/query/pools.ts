import { gql } from '../__generated__';

export const getPoolsWithHourDataGQL = gql(/* GraphQL */ `
  query PoolsWithHourDataQuery($where: Pool_filter, $hourDataWhere: PoolHourData_filter) {
    pools(where: $where) {
      id
      feeTier
      totalValueLockedUSD
      totalValueLockedToken0
      totalValueLockedToken1
      token0 { id symbol decimals }
      token1 { id symbol decimals }
      poolHourData(where: $hourDataWhere) {
        volumeUSD
        periodStartUnix
      }
    }
  }
`);
