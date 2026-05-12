import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Video,
  Plus,
  LogIn,
  UserPlus,
  Check,
  X,
  Edit3,
  Trash2,
} from 'lucide-react'
import { useSession } from '../hooks/useSession'
import { useUserNames } from '../hooks/useUserNames'
import {
  GET_MY_JOIN_REQUESTS,
  GET_MY_SESSION_INVITES,
  GET_MY_SESSIONS,
  GET_RECOMMENDED_BUDDIES,
  GET_SESSION_JOIN_REQUESTS,
  GET_UPCOMING_SESSIONS,
} from '../lib/graphql/queries'
import {
  CANCEL_JOIN_REQUEST,
  CANCEL_SESSION,
  INVITE_TO_SESSION,
  LEAVE_SESSION,
  REQUEST_TO_JOIN_SESSION,
  RESPOND_TO_JOIN_REQUEST,
  RESPOND_TO_SESSION_INVITE,
  UPDATE_SESSION,
} from '../lib/graphql/mutations'
import { Spinner } from '../components'

const parseDate = (value) => {
  if (!value) return null
  const numeric = Number(value)
  const ms = Number.isFinite(numeric) ? numeric : Date.parse(String(value))
  if (!Number.isFinite(ms)) return null
  return new Date(ms)
}

const formatDate = (value) => {
  const date = parseDate(value)
  if (!date) return 'Date TBD'
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatTime = (value) => {
  const date = parseDate(value)
  if (!date) return 'Time TBD'
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatDuration = (value) => {
  if (!value && value !== 0) return 'Duration TBD'
  const minutes = Number(value)
  if (!Number.isFinite(minutes)) return String(value)
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? '' : 's'}`
  return `${minutes} min`
}

const getParticipantCount = (session) => {
  if (Number.isFinite(Number(session.participantCount))) {
    return Number(session.participantCount)
  }
  if (Array.isArray(session.participants)) return session.participants.length
  return 0
}

const sessionTypeLabel = (type) =>
  type === 'IN_PERSON' || type === 'in-person' ? 'In-person' : 'Online'

const buildDateTime = (date, time) => {
  if (!date || !time) return null
  const composed = new Date(`${date}T${time}:00`)
  return Number.isNaN(composed.getTime()) ? null : composed.toISOString()
}

const SessionsPage = () => {
  const navigate = useNavigate()
  const { user, loading: userLoading } = useSession()
  const [tab, setTab] = useState('mine')
  const [actionError, setActionError] = useState('')

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showRequestsModal, setShowRequestsModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [invitedIds, setInvitedIds] = useState(new Set())

  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduleDuration, setRescheduleDuration] = useState('')
  const [rescheduleType, setRescheduleType] = useState('ONLINE')
  const [rescheduleLocation, setRescheduleLocation] = useState('')

  const {
    data: mySessionsData,
    loading: mySessionsLoading,
  } = useQuery(GET_MY_SESSIONS, {
    skip: !user?.id,
    errorPolicy: 'all',
  })

  const {
    data: upcomingData,
    loading: upcomingLoading,
  } = useQuery(GET_UPCOMING_SESSIONS, {
    variables: { limit: 50 },
    errorPolicy: 'all',
  })

  const {
    data: myInvitesData,
    loading: invitesLoading,
  } = useQuery(GET_MY_SESSION_INVITES, {
    skip: !user?.id,
    errorPolicy: 'all',
  })

  const {
    data: myRequestsData,
    loading: myRequestsLoading,
  } = useQuery(GET_MY_JOIN_REQUESTS, {
    skip: !user?.id,
    errorPolicy: 'all',
  })

  const {
    data: recommendedBuddiesData,
    loading: buddyIdsLoading,
  } = useQuery(GET_RECOMMENDED_BUDDIES, {
    skip: !user?.id,
    variables: { userId: user?.id, minScore: 50, limit: 100 },
    errorPolicy: 'all',
  })

  const {
    data: joinRequestsData,
    loading: joinRequestsLoading,
  } = useQuery(GET_SESSION_JOIN_REQUESTS, {
    variables: { sessionId: selectedSession?.id || '' },
    skip: !showRequestsModal || !selectedSession?.id,
    errorPolicy: 'all',
  })

  const joinRequesters = useUserNames(
    joinRequestsData?.getSessionJoinRequests?.map((request) => request.requesterId) || []
  )

  const refetchSessions = [{ query: GET_MY_SESSIONS }]

  const [inviteToSession] = useMutation(INVITE_TO_SESSION, {
    refetchQueries: refetchSessions,
  })
  const [respondToInvite] = useMutation(RESPOND_TO_SESSION_INVITE, {
    refetchQueries: [
      { query: GET_MY_SESSION_INVITES },
      { query: GET_MY_SESSIONS },
    ],
  })
  const [requestToJoin] = useMutation(REQUEST_TO_JOIN_SESSION, {
    refetchQueries: [
      { query: GET_MY_JOIN_REQUESTS },
      { query: GET_UPCOMING_SESSIONS, variables: { limit: 50 } },
    ],
  })
  const [cancelJoinRequest] = useMutation(CANCEL_JOIN_REQUEST, {
    refetchQueries: [{ query: GET_MY_JOIN_REQUESTS }],
  })
  const [respondToJoinRequest] = useMutation(RESPOND_TO_JOIN_REQUEST, {
    refetchQueries: [
      { query: GET_SESSION_JOIN_REQUESTS, variables: { sessionId: selectedSession?.id } },
      { query: GET_MY_SESSIONS },
    ],
  })
  const [updateSession] = useMutation(UPDATE_SESSION, {
    refetchQueries: refetchSessions,
  })
  const [cancelSession] = useMutation(CANCEL_SESSION, {
    refetchQueries: refetchSessions,
  })
  const [leaveSession] = useMutation(LEAVE_SESSION, {
    refetchQueries: refetchSessions,
  })

  const nowMs = Date.now()
  const mySessions = mySessionsData?.getMySessions || []
  const myInvites = myInvitesData?.getMySessionInvites || []
  const myJoinRequests = myRequestsData?.getMyJoinRequests || []
  const matchedBuddies = recommendedBuddiesData?.recommendedBuddies || []
  const matchedBuddyNames = useUserNames(matchedBuddies.map((buddy) => buddy.userId))
  const matchedBuddyById = useMemo(
    () => new Map(matchedBuddies.map((buddy) => [buddy.userId, buddy])),
    [matchedBuddies]
  )

  const allParticipantIds = useMemo(() => {
    const ids = []
    for (const session of mySessions) {
      if (Array.isArray(session.participants)) {
        session.participants.forEach((p) => {
          if (p.userId && p.userId !== user?.id) ids.push(p.userId)
        })
      }
    }
    return [...new Set(ids)]
  }, [mySessions, user?.id])

  const participantNames = useUserNames(allParticipantIds)

  const joinRequestsBySession = useMemo(() => {
    const map = new Map()
    myJoinRequests.forEach((request) => {
      map.set(request.sessionId, request)
    })
    return map
  }, [myJoinRequests])

  const pendingInvites = myInvites.filter((invite) => invite.status === 'PENDING')

  const { myUpcoming, myPast } = useMemo(() => {
    const upcoming = []
    const past = []
    for (const session of mySessions) {
      if (session.status === 'CANCELLED') continue
      const date = parseDate(session.date)
      if (!date) continue
      if (date.getTime() >= nowMs) {
        upcoming.push(session)
      } else {
        past.push(session)
      }
    }
    upcoming.sort((a, b) => {
      const aMs = parseDate(a.date)?.getTime() || 0
      const bMs = parseDate(b.date)?.getTime() || 0
      return aMs - bMs
    })
    past.sort((a, b) => {
      const aMs = parseDate(a.date)?.getTime() || 0
      const bMs = parseDate(b.date)?.getTime() || 0
      return bMs - aMs
    })
    return { myUpcoming: upcoming, myPast: past }
  }, [mySessions, nowMs])

  const discoverSessions = useMemo(() => {
    const upcoming = upcomingData?.getUpcomingSessions || []
    const mySessionIds = new Set(mySessions.map((session) => session.id))
    return upcoming
      .filter((session) => session.status !== 'CANCELLED')
      .filter((session) => session.creatorId !== user?.id)
      .filter((session) => matchedBuddyById.has(session.creatorId))
      .filter((session) => !mySessionIds.has(session.id))
      .sort((a, b) => {
        const aMs = parseDate(a.date)?.getTime() || 0
        const bMs = parseDate(b.date)?.getTime() || 0
        return aMs - bMs
      })
  }, [upcomingData, mySessions, user?.id, matchedBuddyById])

  const isLoading =
    userLoading ||
    mySessionsLoading ||
    upcomingLoading ||
    invitesLoading ||
    myRequestsLoading ||
    buddyIdsLoading

  const openInviteModal = (session) => {
    setSelectedSession(session)
    setInvitedIds(new Set())
    setShowInviteModal(true)
  }

  const openRequestsModal = (session) => {
    setSelectedSession(session)
    setShowRequestsModal(true)
  }

  const openRescheduleModal = (session) => {
    setSelectedSession(session)
    const date = parseDate(session.date)
    if (date) {
      setRescheduleDate(date.toISOString().slice(0, 10))
      setRescheduleTime(date.toTimeString().slice(0, 5))
    }
    setRescheduleDuration(String(session.duration || ''))
    setRescheduleType(session.type || 'ONLINE')
    setRescheduleLocation(session.location || '')
    setShowRescheduleModal(true)
  }

  const handleInvite = async (buddyId) => {
    if (!selectedSession?.id) return
    try {
      setActionError('')
      await inviteToSession({
        variables: { sessionId: selectedSession.id, userId: buddyId },
      })
      setInvitedIds((prev) => new Set([...prev, buddyId]))
    } catch (error) {
      setActionError(error.message || 'Failed to invite buddy')
    }
  }

  const handleInviteResponse = async (inviteId, accept) => {
    try {
      setActionError('')
      await respondToInvite({ variables: { inviteId, accept } })
    } catch (error) {
      setActionError(error.message || 'Failed to respond to invite')
    }
  }

  const handleRequestToJoin = async (sessionId) => {
    try {
      setActionError('')
      await requestToJoin({ variables: { sessionId } })
    } catch (error) {
      setActionError(error.message || 'Failed to request to join')
    }
  }

  const handleCancelRequest = async (requestId) => {
    try {
      setActionError('')
      await cancelJoinRequest({ variables: { requestId } })
    } catch (error) {
      setActionError(error.message || 'Failed to cancel request')
    }
  }

  const handleRequestDecision = async (requestId, approve) => {
    try {
      setActionError('')
      await respondToJoinRequest({ variables: { requestId, approve } })
      if (approve) {
        setShowRequestsModal(false)
      }
    } catch (error) {
      setActionError(error.message || 'Failed to update request')
    }
  }

  const handleReschedule = async (event) => {
    event.preventDefault()
    if (!selectedSession?.id) return

    const dateTime = buildDateTime(rescheduleDate, rescheduleTime)
    if (!dateTime) {
      setActionError('Please provide a valid date and time')
      return
    }

    try {
      setActionError('')
      await updateSession({
        variables: {
          sessionId: selectedSession.id,
          input: {
            date: dateTime,
            duration: Number(rescheduleDuration) || selectedSession.duration,
            type: rescheduleType,
            location:
              rescheduleType === 'IN_PERSON' ? rescheduleLocation : null,
          },
        },
      })
      setShowRescheduleModal(false)
    } catch (error) {
      setActionError(error.message || 'Failed to update session')
    }
  }

  const handleCancelSession = async (sessionId) => {
    try {
      setActionError('')
      await cancelSession({ variables: { sessionId } })
    } catch (error) {
      setActionError(error.message || 'Failed to cancel session')
    }
  }

  const handleLeaveSession = async (sessionId) => {
    try {
      setActionError('')
      await leaveSession({ variables: { sessionId } })
    } catch (error) {
      setActionError(error.message || 'Failed to leave session')
    }
  }

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
        Please log in to view your study sessions.
      </div>
    )
  }

  const SessionCard = ({ session, mode }) => {
    const isOnline = session.type === 'ONLINE' || session.type === 'online'
    const participantCount = getParticipantCount(session)
    const isHost = session.creatorId === user?.id
    const isParticipant = Array.isArray(session.participants) && session.participants.some((p) => p.userId === user?.id)
    const joinRequest = joinRequestsBySession.get(session.id)
    const creatorBuddy = matchedBuddyById.get(session.creatorId)

    return (
      <div className="p-5 bg-[#F4E3C8]/60 rounded-xl border border-[#C76B4F]/10 hover:border-[#C76B4F]/25 transition-all">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[#2B2B2B] text-base truncate">
              {session.topic || 'Study Session'}
            </h3>
            {mode === 'discover' && (
              <p className="text-xs text-[#5A5A5A] mt-0.5 flex items-center gap-1">
                <span>by</span>
                <span className="font-medium text-[#C76B4F]">
                  {creatorBuddy?.name || matchedBuddyNames[session.creatorId] || 'Study buddy'}
                </span>
              </p>
            )}
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold text-white shrink-0 flex items-center gap-1 ${
              isOnline ? 'bg-[#4F7CAC]' : 'bg-[#4CAF50]'
            }`}
          >
            {isOnline ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
            {sessionTypeLabel(session.type)}
          </span>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#5A5A5A] mb-3">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(session.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(session.date)} · {formatDuration(session.duration)}
          </span>
          {!isOnline && session.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {session.location}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {(isHost || isParticipant) && Array.isArray(session.participants) && session.participants.length > 0 && (
            <div className="p-3 bg-white/60 rounded-lg">
              <p className="text-xs font-semibold text-[#2B2B2B] mb-2">Participants</p>
              <div className="flex flex-wrap gap-2">
                {session.participants.map((participant) => (
                  <span key={participant.id} className="px-2.5 py-1 bg-[#C76B4F]/10 text-[#C76B4F] rounded-full text-xs font-medium">
                    {participant.userId === session.creatorId
                      ? `${participantNames[participant.userId] || 'Study buddy'} (Host)`
                      : participantNames[participant.userId] || 'Study buddy'}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm text-[#5A5A5A]">
              <Users className="w-3.5 h-3.5" />
              {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </span>
          <div className="flex gap-2 flex-wrap justify-end">
            {mode === 'mine' && isHost && (
              <>
                <button
                  type="button"
                  onClick={() => openInviteModal(session)}
                  className="px-3 py-1.5 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B55A3E] transition-colors flex items-center gap-1.5 text-xs font-medium"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Invite
                </button>
                <button
                  type="button"
                  onClick={() => openRequestsModal(session)}
                  className="px-3 py-1.5 bg-[#4F7CAC] text-white rounded-lg hover:bg-[#446A96] transition-colors flex items-center gap-1.5 text-xs font-medium"
                >
                  <Users className="w-3.5 h-3.5" />
                  Requests
                </button>
                <button
                  type="button"
                  onClick={() => openRescheduleModal(session)}
                  className="px-3 py-1.5 bg-[#F4A261] text-white rounded-lg hover:bg-[#E39151] transition-colors flex items-center gap-1.5 text-xs font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => handleCancelSession(session.id)}
                  className="px-3 py-1.5 bg-[#E76F51] text-white rounded-lg hover:bg-[#D65F41] transition-colors flex items-center gap-1.5 text-xs font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </>
            )}
            {mode === 'mine' && !isHost && (
              <button
                type="button"
                onClick={() => handleLeaveSession(session.id)}
                className="px-3 py-1.5 bg-[#E76F51] text-white rounded-lg hover:bg-[#D65F41] transition-colors flex items-center gap-1.5 text-xs font-medium"
              >
                Leave
              </button>
            )}
            {mode === 'discover' && (
              <>
                {joinRequest?.status === 'PENDING' ? (
                  <button
                    type="button"
                    onClick={() => handleCancelRequest(joinRequest.id)}
                    className="px-3 py-1.5 bg-[#F4A261] text-white rounded-lg hover:bg-[#E39151] transition-colors flex items-center gap-1.5 text-xs font-medium"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel Request
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRequestToJoin(session.id)}
                    className="px-3 py-1.5 bg-[#4CAF50] text-white rounded-lg hover:bg-[#45A049] transition-colors flex items-center gap-1.5 text-xs font-medium"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Request Join
                  </button>
                )}
              </>
            )}
          </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-[#2B2B2B]"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Study Sessions
          </h1>
          <p className="text-sm text-[#5A5A5A] mt-0.5">
            Manage your sessions and discover sessions from your buddies.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/sessions/create')}
          className="px-4 py-2.5 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B55A3E] transition-colors flex items-center gap-2 text-sm font-semibold shrink-0"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          <Plus className="w-4 h-4" />
          Create Session
        </button>
      </div>

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{actionError}</p>
        </div>
      )}

      <div className="flex gap-1 p-1 bg-white rounded-xl border border-gray-200 w-fit">
        <button
          type="button"
          onClick={() => setTab('mine')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'mine'
              ? 'bg-[#C76B4F] text-white shadow-sm'
              : 'text-[#5A5A5A] hover:text-[#2B2B2B]'
          }`}
        >
          My Sessions
          {myUpcoming.length > 0 && (
            <span
              className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                tab === 'mine'
                  ? 'bg-white/20'
                  : 'bg-[#F4E3C8] text-[#C76B4F]'
              }`}
            >
              {myUpcoming.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('discover')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'discover'
              ? 'bg-[#C76B4F] text-white shadow-sm'
              : 'text-[#5A5A5A] hover:text-[#2B2B2B]'
          }`}
        >
          Discover
          {discoverSessions.length > 0 && (
            <span
              className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                tab === 'discover'
                  ? 'bg-white/20'
                  : 'bg-[#4CAF50]/10 text-[#4CAF50]'
              }`}
            >
              {discoverSessions.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'mine' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2
                className="font-semibold text-[#2B2B2B]"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Upcoming Sessions
              </h2>
            </div>
            <div className="p-5">
              {myUpcoming.length === 0 ? (
                <div className="text-center py-10">
                  <Calendar className="w-12 h-12 text-[#5A5A5A] mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium text-[#2B2B2B] mb-1">
                    No upcoming sessions
                  </p>
                  <p className="text-xs text-[#5A5A5A]">
                    Create one or check Discover for sessions from buddies.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myUpcoming.map((session) => (
                    <SessionCard key={session.id} session={session} mode="mine" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {myPast.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2
                  className="font-semibold text-[#2B2B2B]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Past Sessions
                </h2>
              </div>
              <div className="p-5 space-y-2">
                {myPast.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3.5 bg-gray-50 rounded-lg opacity-70"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#2B2B2B]">
                        {session.topic || 'Study Session'}
                      </p>
                      <p className="text-xs text-[#5A5A5A] mt-0.5">
                        {formatDate(session.date)} at {formatTime(session.date)}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-gray-200 text-[#5A5A5A] rounded-full text-xs font-medium">
                      Completed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'discover' && (
        <div className="space-y-5">
          {pendingInvites.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2
                  className="font-semibold text-[#2B2B2B]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Session Invites
                </h2>
                <p className="text-xs text-[#5A5A5A] mt-0.5">
                  Respond to sessions you have been invited to.
                </p>
              </div>
              <div className="p-5 space-y-3">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="p-4 bg-[#F4E3C8]/40 rounded-xl border border-[#C76B4F]/15"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#2B2B2B]">
                          {invite.session?.topic || 'Study Session'}
                        </p>
                        <p className="text-xs text-[#5A5A5A]">
                          {formatDate(invite.session?.date)} at{' '}
                          {formatTime(invite.session?.date)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleInviteResponse(invite.id, true)}
                          className="px-3 py-1.5 bg-[#4CAF50] text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInviteResponse(invite.id, false)}
                          className="px-3 py-1.5 bg-[#F4A261] text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2
                className="font-semibold text-[#2B2B2B]"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Sessions from Your Buddies
              </h2>
              <p className="text-xs text-[#5A5A5A] mt-0.5">
                Request to join sessions created by your accepted buddies.
              </p>
            </div>
            <div className="p-5">
              {discoverSessions.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-12 h-12 text-[#5A5A5A] mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium text-[#2B2B2B] mb-1">
                    No sessions to discover
                  </p>
                  <p className="text-xs text-[#5A5A5A]">
                    Check back later for newly created sessions.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {discoverSessions.map((session) => (
                    <SessionCard key={session.id} session={session} mode="discover" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showInviteModal && selectedSession && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="bg-[#F4E3C8] rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#C76B4F] to-[#E76F51]">
              <h3
                className="text-lg font-bold text-white"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Invite Matching Buddies
              </h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {matchedBuddies.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-[#5A5A5A] mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-[#5A5A5A]">
                    No matching buddies found
                  </p>
                  <p className="text-xs text-[#5A5A5A] mt-1">
                    Only users with a 50%+ match score can be invited
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {matchedBuddies.map((buddy) => (
                    <div
                      key={buddy.userId}
                      className="flex items-center justify-between p-3.5 bg-white rounded-xl shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C76B4F] to-[#E76F51] flex items-center justify-center text-white font-bold text-sm">
                          {(buddy.name || matchedBuddyNames[buddy.userId] || 'Buddy').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#2B2B2B]">
                            {buddy.name || matchedBuddyNames[buddy.userId] || 'Study buddy'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-semibold text-[#4CAF50]">
                              {buddy.score}% match
                            </span>
                            {buddy.sharedCourses?.length > 0 && (
                              <span className="text-xs text-[#5A5A5A]">
                                · {buddy.sharedCourses.length} shared course{buddy.sharedCourses.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInvite(buddy.userId)}
                        disabled={invitedIds.has(buddy.userId)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          invitedIds.has(buddy.userId)
                            ? 'bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/30 cursor-default'
                            : 'bg-[#C76B4F] text-white hover:bg-[#B55A3E]'
                        }`}
                      >
                        {invitedIds.has(buddy.userId) ? (
                          <><Check className="w-3 h-3" /> Invited</>
                        ) : (
                          <><UserPlus className="w-3 h-3" /> Invite</>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="w-full py-2.5 bg-white text-[#2B2B2B] rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium border border-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequestsModal && selectedSession && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowRequestsModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-[#2B2B2B]">Join Requests</h3>
                <p className="text-xs text-[#5A5A5A]">
                  Review requests to join {selectedSession.topic}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestsModal(false)}
                className="text-[#5A5A5A] hover:text-[#2B2B2B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {joinRequestsLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Spinner size="md" />
                </div>
              ) : joinRequestsData?.getSessionJoinRequests?.length ? (
                <div className="space-y-3">
                  {joinRequestsData.getSessionJoinRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 bg-[#F4E3C8]/40 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#2B2B2B]">
                          {joinRequesters[request.requesterId] || 'Study buddy'}
                        </p>
                        <p className="text-xs text-[#5A5A5A]">
                          Requested {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleRequestDecision(request.id, true)}
                          className="px-3 py-1.5 bg-[#4CAF50] text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRequestDecision(request.id, false)}
                          className="px-3 py-1.5 bg-[#F4A261] text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Users className="w-10 h-10 text-[#5A5A5A] mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-[#5A5A5A]">No pending requests</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRescheduleModal && selectedSession && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowRescheduleModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-[#2B2B2B]">Update Session</h3>
                <p className="text-xs text-[#5A5A5A]">
                  Adjust timing or location for {selectedSession.topic}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="text-[#5A5A5A] hover:text-[#2B2B2B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReschedule} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(event) => setRescheduleDate(event.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                    Time
                  </label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(event) => setRescheduleTime(event.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="30"
                  max="480"
                  value={rescheduleDuration}
                  onChange={(event) => setRescheduleDuration(event.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                  Session Type
                </label>
                <select
                  value={rescheduleType}
                  onChange={(event) => setRescheduleType(event.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="ONLINE">Online</option>
                  <option value="IN_PERSON">In-person</option>
                </select>
              </div>
              {rescheduleType === 'IN_PERSON' && (
                <div>
                  <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={rescheduleLocation}
                    onChange={(event) => setRescheduleLocation(event.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2.5 border-2 border-gray-200 text-[#2B2B2B] rounded-lg text-sm"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B55A3E] transition-colors text-sm font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SessionsPage
