export const typeDefs = `#graphql

  enum DayOfWeek {
    SUNDAY
    MONDAY
    TUESDAY
    WEDNESDAY
    THURSDAY
    FRIDAY
    SATURDAY
  }

  type AvailabilitySlot {
    id:          String!
    userId:      String!
    dayOfWeek:   DayOfWeek!
    startTime:   String!
    endTime:     String!
    isRecurring: Boolean!
    createdAt:   String
    updatedAt:   String
  }

  type OverlapResult {
    userId:           String!
    overlappingSlots: [AvailabilitySlot]
  }

  type Query {
    myAvailability(userId: String!): [AvailabilitySlot]
    userAvailability(userId: String!): [AvailabilitySlot]
    availabilitySlot(id: String!): AvailabilitySlot
    overlappingUsers(
      userId:    String!
      dayOfWeek: DayOfWeek!
      startTime: String!
      endTime:   String!
    ): [String]
    overlappingUsersDetailed(
      userId:    String!
      dayOfWeek: DayOfWeek!
      startTime: String!
      endTime:   String!
    ): [OverlapResult]
  }

  type Mutation {
    addAvailabilitySlot(
      userId:      String!
      dayOfWeek:   DayOfWeek!
      startTime:   String!
      endTime:     String!
      isRecurring: Boolean
    ): AvailabilitySlot

    updateAvailabilitySlot(
      id:          String!
      startTime:   String
      endTime:     String
      isRecurring: Boolean
    ): AvailabilitySlot

    deleteAvailabilitySlot(id: String!): Boolean
    clearAvailability(userId: String!): Boolean
  }
`;