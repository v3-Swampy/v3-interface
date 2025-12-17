import { gql } from '../__generated__';

export const getUserPositionIDsGQL = gql(/* GraphQL */ `
  query UserPositionIDsQuery($where: ManagedPosition_filter = {}) {
    managedPositions(where: $where) {
      id
    }
  }
`);

export const getPoolIncentivesGQL = gql(/* GraphQL */ `
  query PoolIncentivesQuery($where: Incentive_filter = {}) {
    incentives(where: $where) {
      pool
      rewardToken
    }
  }
`);
