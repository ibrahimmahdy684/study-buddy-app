import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  MessageCircle,
  Star,
  Users,
} from 'lucide-react'
import { useSession } from '../hooks/useSession'
import { GET_PROFILE, GET_RECOMMENDED_BUDDIES } from '../lib/graphql/queries'
import { GET_OR_CREATE_CONVERSATION } from '../lib/graphql/mutations'
import { SEND_BUDDY_REQUEST } from '../lib/graphql/mutations'
import { Card, Spinner } from '../components'

const MatchDetails = () => {
  const { buddyId } = useParams()
  const navigate = useNavigate()
  const { user, loading: userLoading } = useSession()
  const [actionError, setActionError] = useState('')

  const { data: matchesData, loading: matchesLoading } = useQuery(
    GET_RECOMMENDED_BUDDIES,
    {
      variables: { userId: user?.id, limit: 50, minScore: 0 },
      skip: !user?.id,
      errorPolicy: 'all',
    }
  )

  const { data: buddyProfileData, loading: buddyProfileLoading } = useQuery(
    GET_PROFILE,
    {
      variables: { userId: buddyId },
      skip: !buddyId,
      errorPolicy: 'all',
    }
  )

  const { data: myProfileData, loading: myProfileLoading } = useQuery(
    GET_PROFILE,
    {
      variables: { userId: user?.id },
      skip: !user?.id,
      errorPolicy: 'all',
    }
  )

  const [getOrCreateConversation] = useMutation(
    GET_OR_CREATE_CONVERSATION
  )
  const [sendBuddyRequest] = useMutation(SEND_BUDDY_REQUEST)

  const match = (matchesData?.recommendedBuddies || []).find(
    (candidate) => candidate.userId === buddyId
  )
  const buddyProfile = buddyProfileData?.profile
  const myProfile = myProfileData?.profile

  const sharedCourses = useMemo(() => {
    const myCourses = myProfile?.courses || []
    const buddyCourses = buddyProfile?.courses || []
    return myCourses
      .map((course) => course.name || course.code)
      .filter((courseName) =>
        buddyCourses.some((buddyCourse) => {
          const label = buddyCourse.name || buddyCourse.code
          return label === courseName
        })
      )
      .filter(Boolean)
  }, [myProfile, buddyProfile])

  const isLoading =
    userLoading ||
    matchesLoading ||
    buddyProfileLoading ||
    myProfileLoading

  const handleMessage = async () => {
    if (!buddyId) return
    try {
      setActionError('')
      const result = await getOrCreateConversation({
        variables: { otherUserId: buddyId },
      })
      const conversation = result?.data?.getOrCreateConversation
      if (conversation?.id) {
        navigate(`/messages/${conversation.id}`)
      }
    } catch (error) {
      setActionError(error.message || 'Unable to start a conversation')
    }
  }

  const handleBuddyRequest = async () => {
    if (!buddyId) return
    try {
      setActionError('')
      await sendBuddyRequest({ variables: { toUserId: buddyId } })
    } catch (error) {
      setActionError(error.message || 'Unable to send buddy request')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!buddyId || !buddyProfile) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card padding="lg">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#2B2B2B] mb-2">
              Buddy not found
            </h2>
            <button
              type="button"
              onClick={() => navigate('/matching')}
              className="mt-4 px-6 py-3 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B35A3F] transition-colors"
            >
              Back to Matching
            </button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        type="button"
        onClick={() => navigate('/matching')}
        className="flex items-center gap-2 text-[#C76B4F] hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Matching
      </button>

      {actionError && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{actionError}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#C76B4F] to-[#E76F51] p-8 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-[#C76B4F] text-4xl font-bold">
                {(buddyProfile.userId || buddyId).charAt(0).toUpperCase()}
              </div>
              <div>
                <h1
                  className="text-3xl font-bold mb-2"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Buddy {buddyId.slice(0, 8)}
                </h1>
                <p className="text-white/90 text-lg">{buddyProfile.studyMode || 'Study buddy'}</p>
                {buddyProfile.studyPace && (
                  <p className="text-white/90">{buddyProfile.studyPace}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-8 h-8 fill-current" />
                <span className="text-4xl font-bold">
                  {match?.score ?? 0}%
                </span>
              </div>
              <p className="text-white/90">Compatible</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <h2
              className="text-xl font-semibold text-[#2B2B2B] mb-3"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              About
            </h2>
            <p className="text-[#2B2B2B]">
              {buddyProfile.bio || 'No bio provided yet.'}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-[#C76B4F]" />
              <h2
                className="text-xl font-semibold text-[#2B2B2B]"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Shared Courses ({sharedCourses.length})
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {sharedCourses.length === 0 ? (
                <p className="text-[#5A5A5A]">No shared courses</p>
              ) : (
                sharedCourses.map((course) => (
                  <span
                    key={course}
                    className="px-4 py-2 bg-[#4CAF50] text-white rounded-lg"
                  >
                    {course}
                  </span>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#2B2B2B] mb-2">
              All Courses
            </h3>
            <div className="flex flex-wrap gap-2">
              {(buddyProfile.courses || []).map((course) => {
                const label = course.name || course.code
                const isShared = sharedCourses.includes(label)
                return (
                  <span
                    key={course.id}
                    className={`px-3 py-1 rounded-full text-sm ${
                      isShared
                        ? 'bg-[#4CAF50] text-white'
                        : 'bg-[#F4E3C8] text-[#2B2B2B]'
                    }`}
                  >
                    {label}
                  </span>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-[#C76B4F]" />
              <h2
                className="text-xl font-semibold text-[#2B2B2B]"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Study Preferences
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F4E3C8] rounded-lg">
                <p className="text-sm text-[#5A5A5A] mb-1">Study Pace</p>
                <p className="font-semibold text-[#2B2B2B]">
                  {buddyProfile.studyPace || 'Not shared'}
                </p>
              </div>
              <div className="p-4 bg-[#F4E3C8] rounded-lg">
                <p className="text-sm text-[#5A5A5A] mb-1">Study Mode</p>
                <p className="font-semibold text-[#2B2B2B]">
                  {buddyProfile.studyMode || 'Not shared'}
                </p>
              </div>
              <div className="p-4 bg-[#F4E3C8] rounded-lg">
                <p className="text-sm text-[#5A5A5A] mb-1">Group Size</p>
                <p className="font-semibold text-[#2B2B2B]">
                  {buddyProfile.preferredGroupSize || 'Not shared'}
                </p>
              </div>
              <div className="p-4 bg-[#F4E3C8] rounded-lg">
                <p className="text-sm text-[#5A5A5A] mb-1">Study Style</p>
                <p className="font-semibold text-[#2B2B2B]">
                  {buddyProfile.studyStyle || 'Not shared'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleBuddyRequest}
              className="flex-1 px-6 py-3 bg-[#E76F51] text-white rounded-lg hover:bg-[#D65F41] transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Buddy Request
            </button>
            <button
              type="button"
              onClick={handleMessage}
              className="flex-1 px-6 py-3 bg-[#4F7CAC] text-white rounded-lg hover:bg-[#446A96] transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Send Message
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MatchDetails
