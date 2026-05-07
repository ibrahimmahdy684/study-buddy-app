import React, { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import {
  Bell,
  Check,
  Users,
  Calendar,
  Star,
  MessageCircle,
  Trash2,
} from 'lucide-react'
import { useSession } from '../hooks/useSession'
import { GET_NOTIFICATIONS } from '../lib/graphql/queries'
import {
  MARK_AS_READ,
  MARK_ALL_AS_READ,
  DELETE_NOTIFICATION,
} from '../lib/graphql/mutations'
import { NOTIFICATION_LABELS } from '../lib/constants'
import { Notification } from '../lib/types'
import { Card, Spinner } from '../components'

const getIcon = (type: string) => {
  switch (type) {
    case 'match_found':
      return <Star className="w-5 h-5 text-[#4CAF50]" />
    case 'buddy_request':
      return <Users className="w-5 h-5 text-[#E76F51]" />
    case 'session_invite':
    case 'session_reminder':
      return <Calendar className="w-5 h-5 text-[#4F7CAC]" />
    case 'message':
      return <MessageCircle className="w-5 h-5 text-[#C76B4F]" />
    default:
      return <Bell className="w-5 h-5 text-[#F4A261]" />
  }
}

const NotificationsPage = () => {
  const { user, loading: userLoading } = useSession()
  const [actionError, setActionError] = useState('')

  const {
    data,
    loading,
    error: queryError,
  } = useQuery<{ notifications: Notification[] }>(GET_NOTIFICATIONS, {
    variables: { userId: user?.id },
    skip: !user?.id,
    errorPolicy: 'all',
  })

  const refetchOpts = {
    refetchQueries: [
      { query: GET_NOTIFICATIONS, variables: { userId: user?.id } },
    ],
  }
  const [markAsRead] = useMutation(MARK_AS_READ, refetchOpts)
  const [markAllAsRead] = useMutation(MARK_ALL_AS_READ, refetchOpts)
  const [deleteNotification] = useMutation(DELETE_NOTIFICATION, refetchOpts)

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      setActionError('')
      await markAsRead({ variables: { notificationId } })
    } catch (err: any) {
      setActionError(err.message || 'Failed to mark notification as read')
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return
    try {
      setActionError('')
      await markAllAsRead({ variables: { userId: user.id } })
    } catch (err: any) {
      setActionError(err.message || 'Failed to mark all as read')
    }
  }

  const handleDelete = async (notificationId: string) => {
    try {
      setActionError('')
      await deleteNotification({ variables: { notificationId } })
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete notification')
    }
  }

  const notifications = data?.notifications || []
  const unreadNotifications = notifications.filter((n) => !n.read)
  const readNotifications = notifications.filter((n) => n.read)
  const isLoading = userLoading || loading

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-bold text-[#2B2B2B] mb-2"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Notifications
            </h1>
            <p className="text-[#5A5A5A]">
              Stay updated with your study buddy activities
            </p>
          </div>
          {unreadNotifications.length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-[#C76B4F] hover:text-[#B85A40] font-semibold whitespace-nowrap"
            >
              Mark all as read
            </button>
          )}
        </div>

        {actionError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{actionError}</p>
          </div>
        )}

        {queryError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">
              {queryError.message || 'Failed to load notifications'}
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" />
          </div>
        )}

        {!isLoading && unreadNotifications.length > 0 && (
          <Card padding="md">
            <h2 className="text-xl font-semibold text-[#2B2B2B] mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#E76F51]" />
              New Notifications ({unreadNotifications.length})
            </h2>

            <div className="space-y-3">
              {unreadNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 bg-[#F4E3C8] rounded-lg border-l-4 border-[#E76F51] hover:bg-[#EDD9B8] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 bg-[#C76B4F] text-white text-xs font-semibold rounded">
                          {NOTIFICATION_LABELS[notification.type] ||
                            notification.type}
                        </span>
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                          New
                        </span>
                      </div>
                      <h3 className="font-semibold text-[#2B2B2B] mb-1">
                        {notification.title}
                      </h3>
                      <p className="text-[#2B2B2B] text-sm mb-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-[#5A5A5A]">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-5 h-5 text-[#4CAF50]" />
                      </button>
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {!isLoading && readNotifications.length > 0 && (
          <Card padding="md">
            <h2 className="text-xl font-semibold text-[#2B2B2B] mb-4">
              Earlier
            </h2>

            <div className="space-y-3">
              {readNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 bg-gray-50 rounded-lg opacity-75"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded">
                          {NOTIFICATION_LABELS[notification.type] ||
                            notification.type}
                        </span>
                      </div>
                      <h3 className="font-semibold text-[#2B2B2B] mb-1">
                        {notification.title}
                      </h3>
                      <p className="text-[#2B2B2B] text-sm mb-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-[#5A5A5A]">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="flex-shrink-0 p-2 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {!isLoading && notifications.length === 0 && (
          <Card padding="lg">
            <div className="text-center py-8">
              <Bell className="w-16 h-16 text-[#5A5A5A] mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-[#2B2B2B] mb-2">
                No notifications yet
              </h3>
              <p className="text-[#5A5A5A]">
                When you get matched with study buddies or receive session
                invites, you'll see them here
              </p>
            </div>
          </Card>
        )}
    </div>
  )
}

export default NotificationsPage
