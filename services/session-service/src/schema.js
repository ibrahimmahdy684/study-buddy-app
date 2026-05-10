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

  enum SessionInviteStatus {
    PENDING
    ACCEPTED
    DECLINED
    CANCELLED
  }

  enum SessionJoinRequestStatus {
    PENDING
    APPROVED
    DECLINED
    CANCELLED
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
    location: String
    creatorId: String!
    creatorEmail: String
    creatorPhoneNumber: String
    participants: [SessionParticipant!]!
    participantCount: Int!
    createdAt: String!
    updatedAt: String!
  }

  type SessionInvite {
    id: ID!
    sessionId: String!
    invitedUserId: String!
    invitedById: String!
    status: SessionInviteStatus!
    createdAt: String!
    respondedAt: String
    session: StudySession!
  }

  type SessionJoinRequest {
    id: ID!
    sessionId: String!
    requesterId: String!
    reviewedById: String
    status: SessionJoinRequestStatus!
    createdAt: String!
    respondedAt: String
    session: StudySession!
  }

  input CreateSessionInput {
    topic: String!
    description: String
    date: String!
    duration: Int!
    type: SessionType!
    location: String
  }

  input UpdateSessionInput {
    topic: String
    description: String
    date: String
    duration: Int
    type: SessionType
    location: String
  }

  type Query {
    health: String!
    getSession(id: ID!): StudySession
    getMySessions: [StudySession!]!
    getUpcomingSessions(limit: Int): [StudySession!]!
    getMySessionInvites: [SessionInvite!]!
    getSessionInvites(sessionId: ID!): [SessionInvite!]!
    getMyJoinRequests: [SessionJoinRequest!]!
    getSessionJoinRequests(sessionId: ID!): [SessionJoinRequest!]!
  }

  type Mutation {
    createSession(input: CreateSessionInput!): StudySession!
    updateSession(sessionId: ID!, input: UpdateSessionInput!): StudySession!
    joinSession(sessionId: ID!): StudySession!
    leaveSession(sessionId: ID!): StudySession!
    cancelSession(sessionId: ID!): StudySession!
    completeSession(sessionId: ID!): StudySession!
    inviteToSession(sessionId: ID!, userId: String!): SessionInvite!
    respondToSessionInvite(inviteId: ID!, accept: Boolean!): SessionInvite!
    requestToJoinSession(sessionId: ID!): SessionJoinRequest!
    respondToJoinRequest(requestId: ID!, approve: Boolean!): SessionJoinRequest!
    cancelJoinRequest(requestId: ID!): SessionJoinRequest!
  }
`;

export default typeDefs;
