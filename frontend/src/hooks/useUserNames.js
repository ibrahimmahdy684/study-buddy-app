import { useApolloClient } from '@apollo/client'
import { useEffect, useMemo, useState } from 'react'
import { GET_USER } from '../lib/graphql/queries'

export function useUserNames(userIds = []) {
  const client = useApolloClient()
  const [namesById, setNamesById] = useState({})

  const normalizedIdsKey = useMemo(
    () => [...new Set((userIds || []).map((userId) => String(userId).trim()).filter(Boolean))].join('|'),
    [userIds]
  )

  const normalizedIds = useMemo(
    () => (normalizedIdsKey ? normalizedIdsKey.split('|') : []),
    [normalizedIdsKey]
  )

  useEffect(() => {
    let active = true

    if (normalizedIds.length === 0) {
      setNamesById((current) => (Object.keys(current).length === 0 ? current : {}))
      return undefined
    }

    const loadNames = async () => {
      const entries = await Promise.all(
        normalizedIds.map(async (userId) => {
          try {
            const result = await client.query({
              query: GET_USER,
              variables: { userId },
              fetchPolicy: 'cache-first',
            })
            return [userId, result?.data?.user?.name || '']
          } catch {
            return [userId, '']
          }
        })
      )

      if (active) {
        setNamesById(Object.fromEntries(entries))
      }
    }

    loadNames()

    return () => {
      active = false
    }
  }, [client, normalizedIdsKey, normalizedIds])

  return namesById
}