export const typeDefs = `#graphql

  type AvailabilitySlot {
    id:          String!
    userId:      String!
    dayOfWeek:   Int!
    startTime:   String!
    endTime:     String!
    isRecurring: Boolean!
    createdAt:   String
    updatedAt:   String
  }

  type OverlapResult {
    userId:        String!
    overlappingSlots: [AvailabilitySlot]
  }

  type Query {
    # Get all slots for the logged-in user
    myAvailability(userId: String!): [AvailabilitySlot]

    # Get all slots for any user (used by Matching Service)
    userAvailability(userId: String!): [AvailabilitySlot]

    # Get a single slot by ID
    availabilitySlot(id: String!): AvailabilitySlot

    # Core matching query — returns userIds who are free in the same window
    overlappingUsers(
      userId:     String!
      dayOfWeek:  Int!
      startTime:  String!
      endTime:    String!
    ): [String]

    # Returns full overlap details — richer version for Matching Service
    overlappingUsersDetailed(
      userId:    String!
      dayOfWeek: Int!
      startTime: String!
      endTime:   String!
    ): [OverlapResult]
  }

  type Mutation {
    # Add a new availability slot
    addAvailabilitySlot(
      userId:      String!
      dayOfWeek:   Int!
      startTime:   String!
      endTime:     String!
      isRecurring: Boolean
    ): AvailabilitySlot

    # Update an existing slot
    updateAvailabilitySlot(
      id:          String!
      startTime:   String
      endTime:     String
      isRecurring: Boolean
    ): AvailabilitySlot

    # Delete a single slot
    deleteAvailabilitySlot(id: String!): Boolean

    # Delete ALL slots for a user (e.g. full schedule reset)
    clearAvailability(userId: String!): Boolean
  }
`;