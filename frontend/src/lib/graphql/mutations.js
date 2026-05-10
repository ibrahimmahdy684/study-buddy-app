import { gql } from '@apollo/client'

export const UPDATE_STUDY_PREFERENCES = gql`
  mutation UpdateStudyPreferences(
    $userId: String!
    $input: StudyPreferencesInput!
  ) {
    updateStudyPreferences(userId: $userId, input: $input) {
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

export const SET_COURSES = gql`
  mutation SetCourses($userId: String!, $courses: [CourseInput!]!) {
    setCourses(userId: $userId, courses: $courses) {
      id
      userId
      courses {
        id
        name
        code
      }
      createdAt
      updatedAt
    }
  }
`

export const SET_HELP_TOPICS = gql`
  mutation SetHelpTopics($userId: String!, $topics: [String!]!) {
    setHelpTopics(userId: $userId, topics: $topics) {
      id
      userId
      helpTopics {
        id
        topic
      }
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_ME = gql`
  mutation UpdateMe($input: UpdateMeInput!) {
    updateMe(input: $input) {
      id
      name
      email
      phone
      contactEmail
      university
      academicYear
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($userId: String!, $bio: String) {
    updateProfile(userId: $userId, bio: $bio) {
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

export const MARK_AS_READ = gql`
  mutation MarkAsRead($notificationId: String!) {
    markAsRead(notificationId: $notificationId) {
      id
      read
      createdAt
      updatedAt
    }
  }
`

export const MARK_ALL_AS_READ = gql`
  mutation MarkAllAsRead($userId: String!) {
    markAllAsRead(userId: $userId) {
      id
      read
      createdAt
      updatedAt
    }
  }
`

export const DELETE_NOTIFICATION = gql`
  mutation DeleteNotification($notificationId: String!) {
    deleteNotification(notificationId: $notificationId)
  }
`

export const SEND_MESSAGE = gql`
  mutation SendMessage($receiverId: ID!, $content: String!) {
    sendMessage(receiverId: $receiverId, content: $content) {
      id
      conversationId
      senderId
      content
      createdAt
    }
  }
`

export const GET_OR_CREATE_CONVERSATION = gql`
  mutation GetOrCreateConversation($otherUserId: ID!) {
    getOrCreateConversation(otherUserId: $otherUserId) {
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

export const CREATE_SESSION = gql`
  mutation CreateSession($input: CreateSessionInput!) {
    createSession(input: $input) {
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

export const UPDATE_SESSION = gql`
  mutation UpdateSession($sessionId: ID!, $input: UpdateSessionInput!) {
    updateSession(sessionId: $sessionId, input: $input) {
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

export const CANCEL_SESSION = gql`
  mutation CancelSession($sessionId: ID!) {
    cancelSession(sessionId: $sessionId) {
      id
      status
      updatedAt
    }
  }
`

export const LEAVE_SESSION = gql`
  mutation LeaveSession($sessionId: ID!) {
    leaveSession(sessionId: $sessionId) {
      id
      participantCount
    }
  }
`

export const INVITE_TO_SESSION = gql`
  mutation InviteToSession($sessionId: ID!, $userId: String!) {
    inviteToSession(sessionId: $sessionId, userId: $userId) {
      id
      sessionId
      invitedUserId
      invitedById
      status
      createdAt
      respondedAt
    }
  }
`

export const RESPOND_TO_SESSION_INVITE = gql`
  mutation RespondToSessionInvite($inviteId: ID!, $accept: Boolean!) {
    respondToSessionInvite(inviteId: $inviteId, accept: $accept) {
      id
      status
      respondedAt
      sessionId
    }
  }
`

export const REQUEST_TO_JOIN_SESSION = gql`
  mutation RequestToJoinSession($sessionId: ID!) {
    requestToJoinSession(sessionId: $sessionId) {
      id
      status
      sessionId
      requesterId
      createdAt
    }
  }
`

export const RESPOND_TO_JOIN_REQUEST = gql`
  mutation RespondToJoinRequest($requestId: ID!, $approve: Boolean!) {
    respondToJoinRequest(requestId: $requestId, approve: $approve) {
      id
      status
      respondedAt
      sessionId
      requesterId
    }
  }
`

export const CANCEL_JOIN_REQUEST = gql`
  mutation CancelJoinRequest($requestId: ID!) {
    cancelJoinRequest(requestId: $requestId) {
      id
      status
      respondedAt
      sessionId
    }
  }
`


