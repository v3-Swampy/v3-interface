import { gql } from '../__generated__';

export const getUserDepositsGQL = gql(/* GraphQL */ `
  query UserDepositsQuery($where: Deposit_filter) {
    deposits(where: $where, orderBy: id, orderDirection: desc) {
      id
      owner
      pool
      blockNumber
      blockTimestamp
    }
  }
`);
