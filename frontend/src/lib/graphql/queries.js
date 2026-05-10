import { gql } from '@apollo/client'

export const GET_PROFILE = gql`
  query GetProfile($userId: String!) {
    profile(userId: $userId) {
      id
      userId
      bio
      studyPace
      studyMode
      preferredGroupSize
      studyStyle
      courses {
        id
        name
        code
      }
      helpTopics {
        id
        topic
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_NOTIFICATIONS = gql`
  query GetNotifications($userId: String!) {
    notifications(userId: $userId) {
      id
      userId
      type
      title
      message
      relatedId
      read
      createdAt
      updatedAt
    }
  }
`

export const GET_UNREAD_COUNT = gql`
  query GetUnreadCount($userId: String!) {
    unreadCount(userId: $userId)
  }
`

export const GET_MY_CONVERSATIONS = gql`
  query GetMyConversations {
    getMyConversations {
      id
      participant1Id
      participant2Id
      messages {
        id
        conversationId
        senderId
        content
        createdAt
      }
      lastMessage {
        id
        conversationId
        senderId
        content
        createdAt
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_CONVERSATION = gql`
  query GetConversation($otherUserId: ID!) {
    getConversation(otherUserId: $otherUserId) {
      id
      participant1Id
      participant2Id
      messages {
        id
        conversationId
        senderId
        content
        createdAt
      }
      lastMessage {
        id
        conversationId
        senderId
        content
        createdAt
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_MESSAGES = gql`
  query GetMessages($conversationId: ID!, $limit: Int, $offset: Int) {
    getMessages(
      conversationId: $conversationId
      limit: $limit
      offset: $offset
    ) {
      id
      conversationId
      senderId
      content
      createdAt
    }
  }
`

export const GET_MY_SESSIONS = gql`
  query GetMySessions {
    getMySessions {
      id
      topic
      description
      date
      duration
      type
      status
      location
      creatorId
      creatorEmail
      creatorPhoneNumber
      participants {
        id
        userId
        role
        joinedAt
      }
      participantCount
      createdAt
      updatedAt
    }
  }
`

export const GET_UPCOMING_SESSIONS = gql`
  query GetUpcomingSessions($limit: Int) {
    getUpcomingSessions(limit: $limit) {
      id
      topic
      description
      date
      duration
      type
      status
      location
      creatorId
      participantCount
      createdAt
      updatedAt
    }
  }
`

export const GET_MY_SESSION_INVITES = gql`
  query GetMySessionInvites {
    getMySessionInvites {
      id
      sessionId
      invitedUserId
      invitedById
      status
      createdAt
      respondedAt
      session {
        id
        topic
        description
        date
        duration
        type
        status
        location
        creatorId
        participantCount
      }
    }
  }
`

export const GET_MY_JOIN_REQUESTS = gql`
  query GetMyJoinRequests {
    getMyJoinRequests {
      id
      sessionId
      requesterId
      reviewedById
      status
      createdAt
      respondedAt
      session {
        id
        topic
        description
        date
        duration
        type
        status
        location
        creatorId
        participantCount
      }
    }
  }
`

export const GET_SESSION_JOIN_REQUESTS = gql`
  query GetSessionJoinRequests($sessionId: ID!) {
    getSessionJoinRequests(sessionId: $sessionId) {
      id
      sessionId
      requesterId
      reviewedById
      status
      createdAt
      respondedAt
    }
  }
`

export const GET_ACCEPTED_BUDDY_IDS = gql`
  query GetAcceptedBuddyIds {
    acceptedBuddyIds
  }
`

export const GET_RECOMMENDED_BUDDIES = gql`
  query GetRecommendedBuddies(
    $userId: String!
    $limit: Int
    $minScore: Int
  ) {
    recommendedBuddies(userId: $userId, limit: $limit, minScore: $minScore) {
      userId
      score
      reasons
      sharedCourses
      sharedTopics
      overlapMinutes
    }
  }
`
