import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'

const graphqlEndpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql'

// Create HTTP link
const httpLink = new HttpLink({
  uri: graphqlEndpoint,
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Create Apollo Client
export const apolloClient = new ApolloClient({
  // Cookie-based sessions are sent automatically via credentials: 'include'.
  link: httpLink,
  cache: new InMemoryCache(),
  devtools: {
    enabled: true,
  },
})
