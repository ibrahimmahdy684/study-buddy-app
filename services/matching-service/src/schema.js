const typeDefs = `#graphql
  enum StudyMode {
    ONLINE
    IN_PERSON
    BOTH
  }

  type MatchAvailabilitySlot {
    id: ID!
    dayOfWeek: Int!
    startMinutes: Int!
    endMinutes: Int!
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
    dayOfWeek: Int!
    startMinutes: Int!
    endMinutes: Int!
  }

  type Query {
    health: String!
    matchProfile(userId: String!): MatchProfile
    recommendedBuddies(userId: String!, limit: Int = 10, minScore: Int = 0): [MatchCandidate!]!
  }

  type Mutation {
    upsertMatchProfile(userId: String!, input: MatchProfileInput!): MatchProfile!
    setAvailability(userId: String!, slots: [AvailabilitySlotInput!]!): MatchProfile!
    recalculateMatches(userId: String!, limit: Int = 5, minScore: Int = 55): [MatchCandidate!]!
  }
`;

module.exports = { typeDefs };
