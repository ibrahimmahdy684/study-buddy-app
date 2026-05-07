import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'

export const GET_ME = gql`
  query GetMe {
    me {
      id
      name
      email
      university
      academicYear
    }
  }
`

export function useSession() {
  const { data, loading, error, refetch } = useQuery(GET_ME, {
    errorPolicy: 'ignore' // Don't throw on 401/auth errors
  })

  const user = data?.me || null
  const isAuthenticated = !!user

  // Expose the authenticated user id to non-React modules (e.g. the Apollo
  // WebSocket link in services/apollo.js, which builds connectionParams the
  // first time it opens a socket). This lets subscriptions identify the user
  // even when the upgrade request can't carry the auth cookie.
  if (typeof window !== 'undefined') {
    window.__SB_USER_ID__ = user?.id || null
  }

  return {
    user,
    isAuthenticated,
    loading,
    error,
    refetch
  }
}
