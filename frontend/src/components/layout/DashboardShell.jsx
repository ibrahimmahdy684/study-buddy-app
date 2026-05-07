import React from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { useSession } from '../../hooks/useSession'
import { useAuth } from '../../hooks/useAuth'
import { GET_NOTIFICATIONS } from '../../lib/graphql/queries'
import { DashboardLayout } from './DashboardLayout'

/**
 * Route-level layout: wraps every nested dashboard page in the shared
 * Navbar + Sidebar so individual pages no longer need to import
 * DashboardLayout themselves. Use as a layout route via <Outlet />.
 */
export default function DashboardShell() {
  const navigate = useNavigate()
  const { user, loading: userLoading } = useSession()
  const { logout } = useAuth()

  const { data: notificationsData } = useQuery(GET_NOTIFICATIONS, {
    variables: { userId: user?.id },
    skip: !user?.id,
    errorPolicy: 'all',
    pollInterval: 30000,
  })

  const unreadCount = (notificationsData?.notifications || []).filter(
    (n) => !n.read
  ).length

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (userLoading) {
    return (
      <DashboardLayout user={null} onLogout={handleLogout}>
        <div className="flex justify-center items-center h-64">
          <span className="inline-block w-8 h-8 border-4 border-[#C76B4F] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      user={user}
      onLogout={handleLogout}
      unreadCount={unreadCount}
    >
      <Outlet context={{ user, logout: handleLogout, unreadCount }} />
    </DashboardLayout>
  )
}
