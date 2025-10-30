import { gql } from '../__generated__';

export const getUserPositionIDsGQL = gql(/* GraphQL */ `
  query UserPositionIDsQuery($where: ManagedPosition_filter = {}) {
    managedPositions(orderBy: id, orderDirection: desc, where: $where) {
      id
    }
  }
`);
