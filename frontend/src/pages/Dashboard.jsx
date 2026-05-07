import { useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import {
  Users,
  Calendar,
  Bell,
  TrendingUp,
  BookOpen,
  Clock,
} from 'lucide-react'
import { useSession } from '../hooks/useSession'
import {
  GET_NOTIFICATIONS,
  GET_MY_SESSIONS,
  GET_RECOMMENDED_BUDDIES,
  GET_PROFILE,
} from '../lib/graphql/queries'
import { Card, Spinner, Avatar } from '../components'

export function Dashboard() {
  const navigate = useNavigate()
  const { user, loading: userLoading } = useSession()

  const { data: notificationsData, loading: notificationsLoading } = useQuery(
    GET_NOTIFICATIONS,
    {
      variables: { userId: user?.id },
      skip: !user?.id,
      errorPolicy: 'all',
    }
  )

  const { data: sessionsData, loading: sessionsLoading } = useQuery(
    GET_MY_SESSIONS,
    {
      skip: !user?.id,
      errorPolicy: 'all',
    }
  )

  const { data: matchesData, loading: matchesLoading } = useQuery(
    GET_RECOMMENDED_BUDDIES,
    {
      variables: { userId: user?.id, limit: 3, minScore: 50 },
      skip: !user?.id,
      errorPolicy: 'all',
    }
  )

  const { data: profileData, loading: profileLoading } = useQuery(GET_PROFILE, {
    variables: { userId: user?.id },
    skip: !user?.id,
    errorPolicy: 'all',
  })

  const notifications = notificationsData?.notifications || []
  const unreadNotifications = notifications.filter((n) => !n.read)
  const allSessions = sessionsData?.getMySessions || []
  const upcomingSessions = allSessions
    .filter((s) => {
      const dateStr = s.date
      const dateMs = Number.isFinite(Number(dateStr))
        ? Number(dateStr)
        : Date.parse(dateStr)
      return Number.isFinite(dateMs) && dateMs >= Date.now()
    })
    .slice(0, 3)
  const recommendedBuddies = matchesData?.recommendedBuddies || []
  const profile = profileData?.profile

  const profileComplete = Boolean(
    profile && profile.studyMode && profile.courses?.length > 0
  )

  const isLoading =
    userLoading ||
    notificationsLoading ||
    sessionsLoading ||
    matchesLoading ||
    profileLoading

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center text-[#5A5A5A]">
        Please log in to view your dashboard.
      </div>
    )
  }

  // First-run state: prompt to complete profile setup
  if (!profileComplete) {
    return (
      <div className="max-w-4xl mx-auto">
          <Card padding="lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#E76F51] rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2
                className="text-2xl font-bold text-[#2B2B2B] mb-2"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Welcome to StudyBuddy, {user.name}!
              </h2>
              <p className="text-[#5A5A5A] mb-6">
                Let&apos;s set up your profile to find the perfect study partners
              </p>
              <button
                onClick={() => navigate('/profile-setup')}
                className="px-6 py-3 bg-[#E76F51] text-white rounded-lg hover:bg-[#D65F41] transition-colors"
              >
                Complete Your Profile
              </button>
            </div>
          </Card>
        </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-[#C76B4F] to-[#E76F51] rounded-xl shadow-lg p-6 md:p-8 text-white">
          <h1
            className="text-3xl md:text-4xl font-bold mb-2"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Welcome back, {user.name}!
          </h1>
          <p className="text-white/90">
            You have {upcomingSessions.length} upcoming study session
            {upcomingSessions.length !== 1 ? 's' : ''} and{' '}
            {unreadNotifications.length} new notification
            {unreadNotifications.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-[#E76F51]/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-[#E76F51]" />
              </div>
              <TrendingUp className="w-5 h-5 text-[#4CAF50]" />
            </div>
            <h3 className="text-2xl font-bold text-[#2B2B2B]">
              {recommendedBuddies.length}
            </h3>
            <p className="text-[#5A5A5A] text-sm">New Matches</p>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-[#4F7CAC]/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#4F7CAC]" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[#2B2B2B]">
              {upcomingSessions.length}
            </h3>
            <p className="text-[#5A5A5A] text-sm">Upcoming Sessions</p>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-[#F4A261]/10 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-[#F4A261]" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[#2B2B2B]">
              {unreadNotifications.length}
            </h3>
            <p className="text-[#5A5A5A] text-sm">New Notifications</p>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-[#4CAF50]/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-[#4CAF50]" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[#2B2B2B]">
              {profile?.courses?.length ?? 0}
            </h3>
            <p className="text-[#5A5A5A] text-sm">Courses</p>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recommended Study Buddies */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-xl font-bold text-[#2B2B2B]"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Recommended Study Buddies
              </h2>
              <button
                onClick={() => navigate('/dashboard/matching')}
                className="text-[#C76B4F] hover:underline text-sm"
              >
                View All
              </button>
            </div>

            {recommendedBuddies.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-[#5A5A5A] mx-auto mb-2 opacity-50" />
                <p className="text-[#5A5A5A]">No matches yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendedBuddies.map((buddy) => (
                  <div
                    key={buddy.userId}
                    onClick={() =>
                      navigate(`/dashboard/match/${buddy.userId}`)
                    }
                    className="flex items-center gap-4 p-4 bg-[#F4E3C8] rounded-lg hover:bg-[#EDD9B8] transition-colors cursor-pointer"
                  >
                    <Avatar name={buddy.userId} size="md" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#2B2B2B] truncate">
                        Buddy {buddy.userId.slice(0, 8)}
                      </h3>
                      <p className="text-sm text-[#5A5A5A] truncate">
                        {buddy.sharedCourses.length} shared course
                        {buddy.sharedCourses.length !== 1 ? 's' : ''} •{' '}
                        {buddy.sharedTopics.length} topic
                        {buddy.sharedTopics.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-[#4CAF50]">
                        {buddy.score}%
                      </div>
                      <p className="text-xs text-[#5A5A5A]">Match</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming Sessions */}
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-xl font-bold text-[#2B2B2B]"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Upcoming Sessions
              </h2>
              <button
                onClick={() => navigate('/dashboard/sessions')}
                className="text-[#C76B4F] hover:underline text-sm"
              >
                View All
              </button>
            </div>

            {upcomingSessions.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-[#5A5A5A] mx-auto mb-2 opacity-50" />
                <p className="text-[#5A5A5A]">No upcoming sessions</p>
                <button
                  onClick={() => navigate('/dashboard/create-session')}
                  className="mt-4 px-4 py-2 bg-[#E76F51] text-white rounded-lg hover:bg-[#D65F41] transition-colors text-sm"
                >
                  Create a Session
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((session) => {
                  const sessionDate = Number.isFinite(Number(session.date))
                    ? new Date(Number(session.date))
                    : new Date(session.date)
                  return (
                    <div
                      key={session.id}
                      className="p-4 bg-[#F4E3C8] rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <h3 className="font-semibold text-[#2B2B2B]">
                          {session.topic}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded text-xs flex-shrink-0 ${
                            session.type === 'ONLINE'
                              ? 'bg-[#4F7CAC] text-white'
                              : 'bg-[#4CAF50] text-white'
                          }`}
                        >
                          {session.type === 'ONLINE' ? 'Online' : 'In-Person'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[#5A5A5A] flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {sessionDate.toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {sessionDate.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          • {session.duration}min
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Recent Notifications */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-xl font-bold text-[#2B2B2B]"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Recent Notifications
            </h2>
            <button
              onClick={() => navigate('/notifications')}
              className="text-[#C76B4F] hover:underline text-sm"
            >
              View All
            </button>
          </div>

          {notifications.length === 0 ? (
            <p className="text-[#5A5A5A] text-center py-4">
              No notifications yet
            </p>
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    notification.read
                      ? 'bg-white border-gray-200'
                      : 'bg-[#F4E3C8] border-[#E76F51]'
                  }`}
                >
                  <p className="text-[#2B2B2B] font-semibold">
                    {notification.title}
                  </p>
                  <p className="text-[#2B2B2B] text-sm">
                    {notification.message}
                  </p>
                  <p className="text-xs text-[#5A5A5A] mt-1">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/dashboard/matching')}
            className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-[#E76F51] hover:shadow-md transition-all text-left"
          >
            <Users className="w-8 h-8 text-[#E76F51] mb-3" />
            <h3 className="font-semibold text-[#2B2B2B] mb-1">
              Find Study Partners
            </h3>
            <p className="text-sm text-[#5A5A5A]">
              Discover students with similar courses
            </p>
          </button>

          <button
            onClick={() => navigate('/dashboard/create-session')}
            className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-[#4F7CAC] hover:shadow-md transition-all text-left"
          >
            <Calendar className="w-8 h-8 text-[#4F7CAC] mb-3" />
            <h3 className="font-semibold text-[#2B2B2B] mb-1">
              Create Study Session
            </h3>
            <p className="text-sm text-[#5A5A5A]">
              Schedule a new study session
            </p>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-[#4CAF50] hover:shadow-md transition-all text-left"
          >
            <BookOpen className="w-8 h-8 text-[#4CAF50] mb-3" />
            <h3 className="font-semibold text-[#2B2B2B] mb-1">
              Update Profile
            </h3>
            <p className="text-sm text-[#5A5A5A]">
              Edit your preferences and courses
            </p>
          </button>
        </div>
    </div>
  )
}
