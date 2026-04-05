const typeDefs = `#graphql
  enum StudyMode {
    ONLINE
    IN_PERSON
    BOTH
  }

  type Course {
    id: ID!
    name: String!
    code: String
  }

  type HelpTopic {
    id: ID!
    topic: String!
  }

  type Profile {
    id: ID!
    userId: String!
    bio: String
    studyPace: String
    studyMode: StudyMode
    preferredGroupSize: Int
    studyStyle: String
    courses: [Course!]!
    helpTopics: [HelpTopic!]!
    createdAt: String!
    updatedAt: String!
  }

  input StudyPreferencesInput {
    studyPace: String
    studyMode: StudyMode
    preferredGroupSize: Int
    studyStyle: String
  }

  input CourseInput {
    name: String!
    code: String
  }

  type Query {
    profile(userId: String!): Profile
  }

  type Mutation {
    createProfile(userId: String!, bio: String): Profile!
    updateProfile(userId: String!, bio: String): Profile!
    updateStudyPreferences(userId: String!, input: StudyPreferencesInput!): Profile!
    setCourses(userId: String!, courses: [CourseInput!]!): Profile!
    setHelpTopics(userId: String!, topics: [String!]!): Profile!
  }
`;

module.exports = { typeDefs };
