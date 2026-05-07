import { gql } from '@apollo/client'

export const MESSAGE_SENT_SUBSCRIPTION = gql`
  subscription MessageSent($conversationId: ID, $recipientId: ID) {
    messageSent(conversationId: $conversationId, recipientId: $recipientId) {
      id
      conversationId
      senderId
      content
      createdAt
    }
  }
`
