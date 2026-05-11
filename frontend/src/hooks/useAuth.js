import { useState, useEffect, useCallback } from 'react'

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Cookie-based auth should be determined by backend responses (me/session query).
    setIsAuthenticated(false)
    setLoading(false)
  }, [])

  const logout = useCallback(async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
      await fetch(`${apiBase}/graphql`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'mutation Logout { logout { success } }' }),
      })
    } catch (error) {
      // Keep client state consistent even if logout request fails.
    }
    setIsAuthenticated(false)
  }, [])

  return {
    isAuthenticated,
    loading,
    logout,
  }
}
