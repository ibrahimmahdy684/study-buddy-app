import { gql } from "apollo-server";

export const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    phone: String
    contactEmail: String
    university: String
    academicYear: Int
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    message: String!
    token: String!
    user: User!
  }

  type LogoutPayload {
    success: Boolean!
    message: String!
  }

  type DeletePayload {
    success: Boolean!
    message: String!
  }

  input RegisterInput {
    name: String!
    email: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input UpdateMeInput {
    name: String
    phone: String
    contactEmail: String
    university: String
    academicYear: Int
  }

  type Query {
    health: String!
    me: User!
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    logout: LogoutPayload!
    updateMe(input: UpdateMeInput!): User!
    deleteMe: DeletePayload!
  }
`;
