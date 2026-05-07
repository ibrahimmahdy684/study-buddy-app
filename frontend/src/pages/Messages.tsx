import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import {
  Send,
  Search,
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
} from 'lucide-react'
import { useSession } from '../hooks/useSession'
import {
  GET_MY_CONVERSATIONS,
  GET_MESSAGES,
} from '../lib/graphql/queries'
import { SEND_MESSAGE } from '../lib/graphql/mutations'
import { MESSAGE_SENT_SUBSCRIPTION } from '../lib/graphql/subscriptions'
import { Conversation, Message } from '../lib/types'
import { Spinner } from '../components'
import { useSubscription } from '@apollo/client'

const formatTimestamp = (raw?: string | number) => {
  if (raw === undefined || raw === null || raw === '') return ''
  const ms = Number.isFinite(Number(raw)) ? Number(raw) : Date.parse(String(raw))
  if (!Number.isFinite(ms)) return ''
  const date = new Date(ms)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - ms) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const MessagesPage: React.FC = () => {
  const navigate = useNavigate()
  const { conversationId } = useParams<{ conversationId?: string }>()
  const { user, loading: userLoading } = useSession()

  const [searchQuery, setSearchQuery] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [sendError, setSendError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: convData, loading: convLoading } = useQuery<{
    getMyConversations: Conversation[]
  }>(GET_MY_CONVERSATIONS, {
    skip: !user?.id,
    errorPolicy: 'all',
  })

  const conversations = convData?.getMyConversations || []
  const selectedConversation = conversations.find(
    (c) => c.id === conversationId
  )

  const otherParticipantId = useMemo(() => {
    if (!selectedConversation || !user?.id) return null
    return selectedConversation.participant1Id === user.id
      ? selectedConversation.participant2Id
      : selectedConversation.participant1Id
  }, [selectedConversation, user?.id])

  const {
    data: messagesData,
    loading: messagesLoading,
    subscribeToMore,
  } = useQuery<{ getMessages: Message[] }>(GET_MESSAGES, {
    variables: { conversationId: conversationId || '', limit: 100, offset: 0 },
    skip: !conversationId,
    errorPolicy: 'all',
  })

  // Live-update active chat: append messages pushed via subscription.
  useEffect(() => {
    if (!conversationId || !subscribeToMore) return undefined
    const stop = subscribeToMore({
      document: MESSAGE_SENT_SUBSCRIPTION,
      variables: { conversationId },
      updateQuery: (prev, { subscriptionData }) => {
        const incoming = subscriptionData?.data?.messageSent
        if (!incoming) return prev
        const existing = prev?.getMessages || []
        if (existing.some((m) => m.id === incoming.id)) return prev
        return { getMessages: [...existing, incoming] }
      },
    })
    return () => stop && stop()
  }, [conversationId, subscribeToMore])

  // Live-update conversation list: subscribe to all incoming messages for me
  // and refresh the conversation list (which updates lastMessage/order).
  useSubscription(MESSAGE_SENT_SUBSCRIPTION, {
    skip: !user?.id,
    variables: { recipientId: user?.id },
    onData: ({ client }) => {
      // Refresh the conversation list when a message arrives so the sidebar
      // re-orders and shows the new last message preview.
      client.refetchQueries({ include: [GET_MY_CONVERSATIONS] })
    },
  })

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE, {
    // Subscription handles the live-append; only refresh sidebar order on send.
    refetchQueries: [{ query: GET_MY_CONVERSATIONS }],
  })

  const chatMessages = messagesData?.getMessages || []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages.length, conversationId])

  const filteredConversations = conversations.filter((conv) => {
    const otherId =
      conv.participant1Id === user?.id
        ? conv.participant2Id
        : conv.participant1Id
    const last = conv.lastMessage?.content || ''
    const q = searchQuery.toLowerCase()
    return (
      otherId.toLowerCase().includes(q) || last.toLowerCase().includes(q)
    )
  })

  const handleSelectConversation = (id: string) => {
    navigate(`/messages/${id}`)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !otherParticipantId) {
      if (!otherParticipantId) {
        setSendError('Cannot send: missing recipient information')
      }
      return
    }
    try {
      setSendError('')
      await sendMessage({
        variables: {
          receiverId: otherParticipantId,
          content: newMessage.trim(),
        },
      })
      setNewMessage('')
    } catch (err: any) {
      setSendError(err.message || 'Failed to send message')
    }
  }

  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex overflow-hidden">
          {/* Conversations List */}
          <div
            className={`${
              conversationId ? 'hidden md:flex' : 'flex'
            } w-full md:w-80 lg:w-96 flex-col border-r border-gray-200`}
          >
            <div className="p-4 border-b border-gray-200 bg-[#F4E3C8]">
              <h1
                className="text-2xl font-bold text-[#2B2B2B] mb-4"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Messages
              </h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#5A5A5A]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {convLoading ? (
                <div className="p-8 flex justify-center">
                  <Spinner size="md" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-[#F4E3C8] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-[#C76B4F]" />
                  </div>
                  <h3 className="font-semibold text-[#2B2B2B] mb-2">
                    No conversations yet
                  </h3>
                  <p className="text-sm text-[#5A5A5A]">
                    {searchQuery
                      ? 'No results found'
                      : 'Start chatting with your study buddies'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const otherId =
                    conv.participant1Id === user?.id
                      ? conv.participant2Id
                      : conv.participant1Id
                  const last = conv.lastMessage
                  const isSelected = conv.id === conversationId

                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`w-full p-4 flex items-start gap-3 hover:bg-[#F4E3C8] transition-colors border-b border-gray-100 ${
                        isSelected ? 'bg-[#F4E3C8]' : ''
                      }`}
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-[#C76B4F] to-[#E76F51] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {otherId.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-[#2B2B2B] truncate">
                            User {otherId.slice(0, 8)}
                          </h3>
                          {last && (
                            <span className="text-xs text-[#5A5A5A] ml-2 flex-shrink-0">
                              {formatTimestamp(last.createdAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#5A5A5A] truncate">
                          {last
                            ? last.senderId === user?.id
                              ? `You: ${last.content}`
                              : last.content
                            : 'No messages yet'}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div
            className={`${
              conversationId ? 'flex' : 'hidden md:flex'
            } flex-1 flex-col`}
          >
            {selectedConversation && otherParticipantId ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-[#F4E3C8]">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate('/messages')}
                      className="md:hidden p-2 hover:bg-white rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 bg-gradient-to-br from-[#C76B4F] to-[#E76F51] rounded-full flex items-center justify-center text-white font-bold">
                      {otherParticipantId.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-[#2B2B2B] truncate">
                        User {otherParticipantId.slice(0, 8)}
                      </h2>
                      <p className="text-xs text-[#5A5A5A] truncate">
                        {otherParticipantId}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="p-2 hover:bg-white rounded-lg transition-colors"
                      title="Voice call"
                      disabled
                    >
                      <Phone className="w-5 h-5 text-[#5A5A5A]" />
                    </button>
                    <button
                      type="button"
                      className="p-2 hover:bg-white rounded-lg transition-colors"
                      title="Video call"
                      disabled
                    >
                      <Video className="w-5 h-5 text-[#5A5A5A]" />
                    </button>
                    <button
                      type="button"
                      className="p-2 hover:bg-white rounded-lg transition-colors"
                      title="More options"
                      disabled
                    >
                      <MoreVertical className="w-5 h-5 text-[#5A5A5A]" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-[#F4E3C8]/20 to-white">
                  {messagesLoading && chatMessages.length === 0 ? (
                    <div className="flex justify-center pt-12">
                      <Spinner size="md" />
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-[#F4E3C8] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Send className="w-8 h-8 text-[#C76B4F]" />
                      </div>
                      <h3 className="text-lg font-semibold text-[#2B2B2B] mb-2">
                        Start a conversation
                      </h3>
                      <p className="text-[#5A5A5A]">
                        Send a message to coordinate your study sessions
                      </p>
                    </div>
                  ) : (
                    <>
                      {chatMessages.map((message, index) => {
                        const isOwn = message.senderId === user?.id
                        const prev = chatMessages[index - 1]
                        const prevMs = prev
                          ? Number.isFinite(Number(prev.createdAt))
                            ? Number(prev.createdAt)
                            : Date.parse(prev.createdAt)
                          : null
                        const curMs = Number.isFinite(Number(message.createdAt))
                          ? Number(message.createdAt)
                          : Date.parse(message.createdAt)
                        const showDateDivider =
                          index === 0 ||
                          (prevMs &&
                            new Date(prevMs).toDateString() !==
                              new Date(curMs).toDateString())

                        return (
                          <div key={message.id}>
                            {showDateDivider && (
                              <div className="flex items-center justify-center my-4">
                                <div className="px-3 py-1 bg-gray-200 rounded-full text-xs text-[#5A5A5A]">
                                  {new Date(curMs).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </div>
                              </div>
                            )}
                            <div
                              className={`flex ${
                                isOwn ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              <div
                                className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                                  isOwn
                                    ? 'bg-[#C76B4F] text-white rounded-br-sm'
                                    : 'bg-white text-[#2B2B2B] border border-gray-200 rounded-bl-sm'
                                } shadow-sm`}
                              >
                                <p className="break-words whitespace-pre-wrap">
                                  {message.content}
                                </p>
                                <p
                                  className={`text-xs mt-1 ${
                                    isOwn ? 'text-white/70' : 'text-[#5A5A5A]'
                                  }`}
                                >
                                  {new Date(curMs).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {sendError && (
                  <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-sm text-red-700">
                    {sendError}
                  </div>
                )}

                {/* Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-gray-200 bg-white"
                >
                  <div className="flex gap-2 items-end">
                    <button
                      type="button"
                      className="p-2 hover:bg-[#F4E3C8] rounded-lg transition-colors text-[#5A5A5A]"
                      title="Attach file"
                      disabled
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="w-full px-4 py-3 bg-[#F4E3C8]/30 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent pr-12"
                        disabled={sending}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white rounded-lg transition-colors"
                        title="Add emoji"
                        disabled
                      >
                        <Smile className="w-5 h-5 text-[#5A5A5A]" />
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="px-4 py-3 bg-[#C76B4F] text-white rounded-xl hover:bg-[#B35A3F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {sending ? (
                        <Spinner size="sm" color="#ffffff" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-[#F4E3C8]/20 to-white">
                <div className="text-center max-w-md px-6">
                  <div className="w-24 h-24 bg-[#F4E3C8] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Send className="w-12 h-12 text-[#C76B4F]" />
                  </div>
                  <h2
                    className="text-2xl font-bold text-[#2B2B2B] mb-3"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    Your Messages
                  </h2>
                  <p className="text-[#5A5A5A] mb-6">
                    Select a conversation from the list to start chatting with
                    your study buddies. Coordinate study sessions, share notes,
                    and collaborate effectively.
                  </p>
                  <div className="bg-[#F4E3C8]/50 rounded-lg p-4 text-left">
                    <h3 className="font-semibold text-[#2B2B2B] mb-2">
                      Tips for effective communication:
                    </h3>
                    <ul className="text-sm text-[#5A5A5A] space-y-1">
                      <li>• Be clear about study times and locations</li>
                      <li>• Share your availability upfront</li>
                      <li>• Respect response times</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  )
}

export default MessagesPage
