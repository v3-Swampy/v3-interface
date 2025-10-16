import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: import.meta.env.VITE_GraphqlUrl,
  cache: new InMemoryCache(),
});

export const fetchGraphql = client.query;
