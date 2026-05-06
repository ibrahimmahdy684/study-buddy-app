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

  return {
    user,
    isAuthenticated,
    loading,
    error,
    refetch
  }
}
