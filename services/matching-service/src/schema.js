const typeDefs = `#graphql
  enum StudyMode {
    ONLINE
    IN_PERSON
    BOTH
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
  }

  type Mutation {
    upsertMatchProfile(userId: String!, input: MatchProfileInput!): MatchProfile!
    setAvailability(userId: String!, slots: [AvailabilitySlotInput!]!): MatchProfile!
    recalculateMatches(userId: String!, limit: Int = 1000, minScore: Int = 50): [MatchCandidate!]!
  }
`;

module.exports = { typeDefs };
