import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import {
  ArrowRight,
  BookOpen,
  Calendar as CalendarIcon,
  Check,
  Clock,
  UserPlus,
  Users,
} from 'lucide-react'
import { useSession } from '../hooks/useSession'
import { GET_ACCEPTED_BUDDY_IDS } from '../lib/graphql/queries'
import { CREATE_SESSION, INVITE_TO_SESSION } from '../lib/graphql/mutations'
import { Spinner } from '../components'

const durationOptions = [
  { label: '1 hour', minutes: 60 },
  { label: '1.5 hours', minutes: 90 },
  { label: '2 hours', minutes: 120 },
  { label: '2.5 hours', minutes: 150 },
  { label: '3 hours', minutes: 180 },
  { label: '4 hours', minutes: 240 },
]

const toIsoDateTime = (date, time) => {
  if (!date || !time) return null
  const composed = new Date(`${date}T${time}:00`)
  return Number.isNaN(composed.getTime()) ? null : composed.toISOString()
}

const CreateSessionPage = () => {
  const navigate = useNavigate()
  const { user, loading: userLoading } = useSession()
  const [actionError, setActionError] = useState('')

  const [topic, setTopic] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('')
  const [type, setType] = useState('ONLINE')
  const [location, setLocation] = useState('')

  const [step, setStep] = useState(1)
  const [createdSessionId, setCreatedSessionId] = useState(null)
  const [invitedIds, setInvitedIds] = useState(new Set())

  const { data: buddyIdsData, loading: buddyIdsLoading } = useQuery(
    GET_ACCEPTED_BUDDY_IDS,
    {
      skip: !user?.id,
      errorPolicy: 'all',
    }
  )

  const [createSession, { loading: creatingSession }] = useMutation(
    CREATE_SESSION
  )
  const [inviteToSession] = useMutation(INVITE_TO_SESSION)

  const acceptedBuddyIds = buddyIdsData?.acceptedBuddyIds || []

  const isLoading = userLoading || buddyIdsLoading

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!user) return

    const minutes = Number(duration)
    const sessionDate = toIsoDateTime(date, time)

    if (!sessionDate || !minutes) {
      setActionError('Please provide a valid date, time, and duration')
      return
    }

    try {
      setActionError('')
      const result = await createSession({
        variables: {
          input: {
            topic,
            description: null,
            date: sessionDate,
            duration: minutes,
            type,
            location: type === 'IN_PERSON' ? location : null,
          },
        },
      })

      const created = result?.data?.createSession
      if (created?.id) {
        setCreatedSessionId(created.id)
        setStep(2)
      }
    } catch (error) {
      setActionError(error.message || 'Failed to create session')
    }
  }

  const handleInvite = async (buddyId) => {
    if (!createdSessionId) return
    try {
      setActionError('')
      await inviteToSession({
        variables: { sessionId: createdSessionId, userId: buddyId },
      })
      setInvitedIds((prev) => new Set([...prev, buddyId]))
    } catch (error) {
      setActionError(error.message || 'Failed to send invite')
    }
  }

  const handleDone = () => navigate('/sessions')

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-sm text-[#5A5A5A]">
            Please log in to create a session
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        {[
          { n: 1, label: 'Session Details' },
          { n: 2, label: 'Invite Buddies' },
        ].map((item, index) => (
          <div key={item.n} className="flex items-center gap-2">
            {index > 0 && <ArrowRight className="w-4 h-4 text-gray-300" />}
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step > item.n
                    ? 'bg-[#4CAF50] text-white'
                    : step === item.n
                    ? 'bg-[#C76B4F] text-white'
                    : 'bg-gray-200 text-[#5A5A5A]'
                }`}
              >
                {step > item.n ? <Check className="w-3.5 h-3.5" /> : item.n}
              </div>
              <span
                className={`text-sm font-medium ${
                  step === item.n ? 'text-[#C76B4F]' : 'text-[#5A5A5A]'
                }`}
              >
                {item.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {actionError && (
        <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{actionError}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {step === 1 && (
          <>
            <div className="px-6 py-5 border-b border-gray-100">
              <h1
                className="text-2xl font-bold text-[#2B2B2B]"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Create Study Session
              </h1>
              <p className="text-sm text-[#5A5A5A] mt-0.5">
                Set up your session details, then invite matching buddies
              </p>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                  Session Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent text-sm"
                  placeholder="e.g., Algorithms Study Group"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                    Date
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A5A]" />
                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                    Start Time
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A5A]" />
                    <input
                      type="time"
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent text-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent text-sm"
                  required
                >
                  <option value="">Select duration</option>
                  {durationOptions.map((option) => (
                    <option key={option.minutes} value={option.minutes}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                  Session Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Online', value: 'ONLINE' },
                    { label: 'In-Person', value: 'IN_PERSON' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setType(option.value)}
                      className={`px-4 py-3.5 rounded-lg border-2 transition-all text-left ${
                        type === option.value
                          ? option.value === 'ONLINE'
                            ? 'border-[#4F7CAC] bg-[#4F7CAC] text-white'
                            : 'border-[#4CAF50] bg-[#4CAF50] text-white'
                          : 'border-gray-200 bg-white text-[#2B2B2B] hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-sm">{option.label}</div>
                      <div className="text-xs opacity-80 mt-0.5">
                        {option.value === 'ONLINE'
                          ? 'Virtual meeting'
                          : 'Physical location'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {type === 'IN_PERSON' && (
                <div>
                  <label className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent text-sm"
                    placeholder="e.g., Library Room 301"
                    required
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/sessions')}
                  className="px-5 py-2.5 border-2 border-gray-200 text-[#2B2B2B] rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSession}
                  className="flex-1 py-2.5 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B55A3E] transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {creatingSession ? (
                    <Spinner size="sm" color="#ffffff" />
                  ) : (
                    <>
                      Create & Invite Buddies
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-[#C76B4F]/5 to-transparent">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-full bg-[#4CAF50]/10 flex items-center justify-center">
                  <Check className="w-4 h-4 text-[#4CAF50]" />
                </div>
                <h1
                  className="text-2xl font-bold text-[#2B2B2B]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Session Created!
                </h1>
              </div>
              <p className="text-sm text-[#5A5A5A] ml-11">
                <span className="font-medium text-[#2B2B2B]">{topic}</span> — {date}{' '}
                at {time}
              </p>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="w-5 h-5 text-[#C76B4F]" />
                <h2
                  className="text-base font-semibold text-[#2B2B2B]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Invite Your Matching Buddies
                </h2>
              </div>

              {acceptedBuddyIds.length === 0 ? (
                <div className="text-center py-10 bg-[#F4E3C8]/30 rounded-xl border border-dashed border-[#C76B4F]/20">
                  <Users className="w-10 h-10 text-[#5A5A5A] mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-[#5A5A5A] mb-1">
                    No accepted buddies yet
                  </p>
                  <p className="text-xs text-[#5A5A5A]">
                    Accept buddy requests first, then you can invite them
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {acceptedBuddyIds.map((buddyId) => {
                    const invited = invitedIds.has(buddyId)
                    return (
                      <div
                        key={buddyId}
                        className="flex items-center gap-3 p-3.5 bg-[#F4E3C8]/30 rounded-xl border border-gray-100 hover:border-[#C76B4F]/20 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C76B4F] to-[#E76F51] flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {buddyId.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#2B2B2B] truncate">
                            Buddy {buddyId.slice(0, 8)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-[#5A5A5A]">
                              Accepted buddy
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <BookOpen className="w-3 h-3 text-[#5A5A5A]" />
                            <span className="text-[11px] text-[#5A5A5A] truncate">
                              Invite to collaborate
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleInvite(buddyId)}
                          disabled={invited}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                            invited
                              ? 'bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/30 cursor-default'
                              : 'bg-[#C76B4F] text-white hover:bg-[#B55A3E]'
                          }`}
                        >
                          {invited ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Invited
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" /> Invite
                            </>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleDone}
                  className="flex-1 py-2.5 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B55A3E] transition-colors text-sm font-semibold"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {invitedIds.size > 0
                    ? `Done — ${invitedIds.size} invite${
                        invitedIds.size !== 1 ? 's' : ''
                      } sent`
                    : 'Skip & View Sessions'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default CreateSessionPage
