import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
} from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'

const graphqlEndpoint =
  import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql'

// Subscriptions go directly to messaging-service over WebSocket. The gateway
// only proxies HTTP today, so we connect to the messaging service directly
// for live message delivery. Override via VITE_MESSAGING_WS_URL when needed.
const messagingWsEndpoint =
  import.meta.env.VITE_MESSAGING_WS_URL || 'ws://localhost:4007/graphql'

const httpLink = new HttpLink({
  uri: graphqlEndpoint,
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
})

const wsLink = new GraphQLWsLink(
  createClient({
    url: messagingWsEndpoint,
    // Reconnect with backoff if the connection drops.
    retryAttempts: Infinity,
    shouldRetry: () => true,
    // The WS handshake is a separate connection from HTTP, so cookies aren't
    // automatically forwarded by every browser. We expose a globally-mutable
    // hook so the auth layer can stash a token after login if needed.
    connectionParams: () => {
      const token =
        (typeof window !== 'undefined' && window.__SB_AUTH_TOKEN__) || null
      const userId =
        (typeof window !== 'undefined' && window.__SB_USER_ID__) || null
      const params = {}
      if (token) params.authToken = token
      if (userId) params['x-user-id'] = userId
      return params
    },
  }),
)

// Route subscriptions over WS, everything else over HTTP.
const link = split(
  ({ query }) => {
    const def = getMainDefinition(query)
    return (
      def.kind === 'OperationDefinition' && def.operation === 'subscription'
    )
  },
  wsLink,
  httpLink,
)

export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache(),
  devtools: { enabled: true },
})
