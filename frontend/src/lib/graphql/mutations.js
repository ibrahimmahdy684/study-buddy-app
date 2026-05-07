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
