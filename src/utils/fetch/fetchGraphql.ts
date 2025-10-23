import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: import.meta.env.VITE_GraphqlUrl,
  cache: new InMemoryCache(),
});

export const fetchGraphql = client.query;

const stakerClient = new ApolloClient({
  uri: import.meta.env.VITE_StakerGraphqlUrl,
  cache: new InMemoryCache(),
});

export const fetchStakerGraphql = stakerClient.query;
