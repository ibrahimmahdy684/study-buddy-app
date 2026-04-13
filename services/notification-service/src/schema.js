const typeDefs = `#graphql
  type Notification {
    id: ID!
    userId: String!
    type: String!
    title: String!
    message: String!
    relatedId: String
    read: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    notifications(userId: String!): [Notification!]!
    unreadCount(userId: String!): Int!
  }

  type Mutation {
    markAsRead(notificationId: String!): Notification!
    markAllAsRead(userId: String!): [Notification!]!
    deleteNotification(notificationId: String!): Boolean!
  }
`;

export default typeDefs;
