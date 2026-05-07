const typeDefs = `#graphql
    type Message {
        id: ID!
        conversationId: String!
        senderId: String!
        content: String!
        createdAt: String!
    }

    type Conversation {
        id: ID!
        participant1Id: String!
        participant2Id: String!
        messages: [Message!]!
        lastMessage: Message
        createdAt: String!
        updatedAt: String!
    }

    type Query {
        getConversation(otherUserId: ID!): Conversation
        getMyConversations: [Conversation!]!
        getMessages(conversationId: ID!, limit: Int, offset: Int): [Message!]!
    }

    type Mutation {
        sendMessage(receiverId: ID!, content: String!): Message!
        getOrCreateConversation(otherUserId: ID!): Conversation!
    }

    type Subscription {
        # Live stream of new messages.
        # - If conversationId is provided, only events for that conversation are pushed.
        # - If recipientId is provided, only events where the authenticated user is sender or recipient are pushed.
        # - When neither is provided, falls back to events for the authenticated user.
        messageSent(conversationId: ID, recipientId: ID): Message!
    }
`;

export default typeDefs;
