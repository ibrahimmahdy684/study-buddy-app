import React, { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { UserPlus, Check, X, Users } from 'lucide-react'
import { useSession } from '../hooks/useSession'
import { GET_BUDDY_REQUESTS } from '../lib/graphql/queries'
import {
  ACCEPT_BUDDY_REQUEST,
  REJECT_BUDDY_REQUEST,
  CANCEL_BUDDY_REQUEST,
} from '../lib/graphql/mutations'
import { Card, Spinner } from '../components'

const BuddyRequestsPage = () => {
  const { user, loading: userLoading } = useSession()
  const [actionError, setActionError] = useState('')

  const {
    data: requestsData,
    loading: requestsLoading,
  } = useQuery(GET_BUDDY_REQUESTS, {
    skip: !user?.id,
    errorPolicy: 'all',
  })

  const refetchOptions = {
    refetchQueries: [{ query: GET_BUDDY_REQUESTS }],
  }

  const [acceptRequest] = useMutation(ACCEPT_BUDDY_REQUEST, refetchOptions)
  const [rejectRequest] = useMutation(REJECT_BUDDY_REQUEST, refetchOptions)
  const [cancelRequest] = useMutation(CANCEL_BUDDY_REQUEST, refetchOptions)

  const requests = requestsData?.buddyRequests || []
  const incomingRequests = requests.filter(
    (request) =>
      request.toUserId === user?.id && request.status === 'PENDING'
  )
  const outgoingRequests = requests.filter(
    (request) => request.fromUserId === user?.id
  )
  const acceptedBuddies = requests.filter(
    (request) =>
      request.status === 'ACCEPTED' &&
      (request.fromUserId === user?.id || request.toUserId === user?.id)
  )

  const isLoading = userLoading || requestsLoading

  const labelForUser = (userId) =>
    userId ? `Buddy ${userId.slice(0, 8)}` : 'Unknown User'

  const handleAction = async (action, variables) => {
    try {
      setActionError('')
      await action({ variables })
    } catch (error) {
      setActionError(error.message || 'Action failed')
    }
  }

  const acceptedCards = useMemo(() => {
    return acceptedBuddies.map((request) => {
      const buddyId =
        request.fromUserId === user?.id
          ? request.toUserId
          : request.fromUserId

      return {
        id: request.id,
        buddyId,
        label: labelForUser(buddyId),
      }
    })
  }, [acceptedBuddies, user?.id])

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
        Please log in to view buddy requests.
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1
          className="text-3xl font-bold text-[#2B2B2B] mb-2"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          Buddy Requests
        </h1>
        <p className="text-[#5A5A5A]">Manage your study buddy connections</p>
      </div>

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{actionError}</p>
        </div>
      )}

      <Card padding="md">
        <h2 className="text-xl font-semibold text-[#2B2B2B] mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-[#E76F51]" />
          Incoming Requests
        </h2>

        {incomingRequests.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-[#5A5A5A] mx-auto mb-2 opacity-50" />
            <p className="text-[#5A5A5A]">No pending requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incomingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 bg-[#F4E3C8] rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#C76B4F] rounded-full flex items-center justify-center text-white font-semibold">
                    {labelForUser(request.fromUserId).charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#2B2B2B]">
                      {labelForUser(request.fromUserId)}
                    </h3>
                    <p className="text-sm text-[#5A5A5A]">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleAction(acceptRequest, { requestId: request.id })
                    }
                    className="px-4 py-2 bg-[#4CAF50] text-white rounded-lg hover:bg-[#45A049] transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAction(rejectRequest, { requestId: request.id })
                    }
                    className="px-4 py-2 bg-[#F4A261] text-white rounded-lg hover:bg-[#E39151] transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding="md">
        <h2 className="text-xl font-semibold text-[#2B2B2B] mb-4">
          Sent Requests
        </h2>

        {outgoingRequests.filter((request) => request.status === 'PENDING')
          .length === 0 ? (
          <p className="text-[#5A5A5A] text-center py-4">
            No pending sent requests
          </p>
        ) : (
          <div className="space-y-3">
            {outgoingRequests
              .filter((request) => request.status === 'PENDING')
              .map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-[#F4E3C8] rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#4F7CAC] rounded-full flex items-center justify-center text-white font-semibold">
                      {labelForUser(request.toUserId).charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#2B2B2B]">
                        {labelForUser(request.toUserId)}
                      </h3>
                      <p className="text-sm text-[#5A5A5A]">
                        Sent on {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleAction(cancelRequest, { requestId: request.id })
                    }
                    className="px-3 py-1.5 bg-[#F4A261] text-white rounded-full text-sm hover:bg-[#E39151] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ))}
          </div>
        )}
      </Card>

      <Card padding="md">
        <h2 className="text-xl font-semibold text-[#2B2B2B] mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#4CAF50]" />
          My Study Buddies
        </h2>

        {acceptedCards.length === 0 ? (
          <p className="text-[#5A5A5A] text-center py-4">
            No study buddies yet
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {acceptedCards.map((buddy) => (
              <div
                key={buddy.id}
                className="flex items-center gap-4 p-4 bg-[#F4E3C8] rounded-lg"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-[#4CAF50] to-[#45A049] rounded-full flex items-center justify-center text-white font-semibold">
                  {buddy.label.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#2B2B2B]">
                    {buddy.label}
                  </h3>
                  <p className="text-sm text-[#5A5A5A]">Active buddy</p>
                </div>
                <span className="px-3 py-1 bg-[#4CAF50] text-white rounded-full text-sm">
                  Active
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default BuddyRequestsPage
