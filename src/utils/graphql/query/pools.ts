import { gql } from '../__generated__';

export const getPoolsLatestDayDataGQL = gql(/* GraphQL */ `
  query MyQuery($where: Pool_filter) {
    pools(where: $where) {
      id
      poolDayData(first: 1, orderBy: date, orderDirection: desc) {
        id
        volumeUSD
        date
      }
    }
  }
`);
