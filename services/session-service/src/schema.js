const typeDefs = `#graphql
  enum SessionType {
    ONLINE
    IN_PERSON
  }

  enum SessionStatus {
    SCHEDULED
    CANCELLED
    COMPLETED
  }

  enum ParticipantRole {
    CREATOR
    PARTICIPANT
  }

  type SessionParticipant {
    id: ID!
    userId: String!
    role: ParticipantRole!
    joinedAt: String!
  }

  type StudySession {
    id: ID!
    topic: String!
    description: String
    date: String!
    duration: Int!
    type: SessionType!
    status: SessionStatus!
    creatorId: String!
    creatorEmail: String
    creatorPhoneNumber: String
    participants: [SessionParticipant!]!
    participantCount: Int!
    createdAt: String!
    updatedAt: String!
  }

  input CreateSessionInput {
    topic: String!
    description: String
    date: String!
    duration: Int!
    type: SessionType!
  }

  type Query {
    health: String!
    getSession(id: ID!): StudySession
    getMySessions: [StudySession!]!
    getUpcomingSessions(limit: Int): [StudySession!]!
  }

  type Mutation {
    createSession(input: CreateSessionInput!): StudySession!
    joinSession(sessionId: ID!): StudySession!
    leaveSession(sessionId: ID!): StudySession!
    cancelSession(sessionId: ID!): StudySession!
    completeSession(sessionId: ID!): StudySession!
  }
`;

export default typeDefs;
