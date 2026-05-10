const typeDefs = `#graphql
  enum StudyMode {
    ONLINE
    IN_PERSON
    BOTH
  }

  enum BuddyRequestStatus {
    PENDING
    ACCEPTED
    DECLINED
    CANCELLED
  }

  type MatchAvailabilitySlot {
    id: ID!
    date: String!
    startTime: String!
    endTime: String!
  }

  type MatchProfile {
    id: ID!
    userId: String!
    studyPace: String
    studyMode: StudyMode
    preferredGroupSize: Int
    studyStyle: String
    courses: [String!]!
    topics: [String!]!
    availabilities: [MatchAvailabilitySlot!]!
    createdAt: String!
    updatedAt: String!
  }

  type MatchCandidate {
    userId: String!
    score: Int!
    reasons: [String!]!
    sharedCourses: [String!]!
    sharedTopics: [String!]!
    overlapMinutes: Int!
  }

  type BuddyRequest {
    id: ID!
    fromUserId: String!
    toUserId: String!
    status: BuddyRequestStatus!
    createdAt: String!
    respondedAt: String
  }

  input MatchProfileInput {
    studyPace: String
    studyMode: StudyMode
    preferredGroupSize: Int
    studyStyle: String
    courses: [String!]
    topics: [String!]
  }

  input AvailabilitySlotInput {
    date: String!
    startTime: String!
    endTime: String!
  }

  type Query {
    health: String!
    matchProfile(userId: String!): MatchProfile
    recommendedBuddies(userId: String!, limit: Int = 10, minScore: Int = 50): [MatchCandidate!]!
    buddyRequests: [BuddyRequest!]!
    incomingBuddyRequests: [BuddyRequest!]!
    outgoingBuddyRequests: [BuddyRequest!]!
    acceptedBuddyIds: [String!]!
    areBuddies(userId: String!, buddyId: String!): Boolean!
  }

  type Mutation {
    upsertMatchProfile(userId: String!, input: MatchProfileInput!): MatchProfile!
    setAvailability(userId: String!, slots: [AvailabilitySlotInput!]!): MatchProfile!
    recalculateMatches(userId: String!, limit: Int = 1000, minScore: Int = 50): [MatchCandidate!]!
    sendBuddyRequest(toUserId: String!): BuddyRequest!
    acceptBuddyRequest(requestId: ID!): BuddyRequest!
    rejectBuddyRequest(requestId: ID!): BuddyRequest!
    cancelBuddyRequest(requestId: ID!): BuddyRequest!
  }
`;

module.exports = { typeDefs };
