import { gql } from '../__generated__';

export const getUserPositionIDsGQL = gql(/* GraphQL */ `
  query UserPositionIDsQuery($where: ManagedPosition_filter = {}) {
    managedPositions(where: $where) {
      id
    }
  }
`);
