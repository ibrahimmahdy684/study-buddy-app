import * as availabilityService from '../services/availability.service.js';

export const resolvers = {
  Query: {
    // Get all slots for the logged-in user
    myAvailability: (_, { userId }) => {
      return availabilityService.getByUser(userId);
    },

    // Get all slots for any given user (called by Matching Service)
    userAvailability: (_, { userId }) => {
      return availabilityService.getByUser(userId);
    },

    // Get a single slot by its ID
    availabilitySlot: (_, { id }) => {
      return availabilityService.getById(id);
    },

    // Returns just the userIds who overlap — lightweight, used for matching
    overlappingUsers: (_, { userId, dayOfWeek, startTime, endTime }) => {
      return availabilityService.findOverlappingUserIds({
        userId,
        dayOfWeek,
        startTime,
        endTime,
      });
    },

    // Returns full slot details per overlapping user — richer, used for match details page
    overlappingUsersDetailed: (_, { userId, dayOfWeek, startTime, endTime }) => {
      return availabilityService.findOverlappingDetailed({
        userId,
        dayOfWeek,
        startTime,
        endTime,
      });
    },
  },

  Mutation: {
    // Add a new availability slot with overlap + time validation
    addAvailabilitySlot: (_, args) => {
      return availabilityService.addSlot(args);
    },

    // Update an existing slot by ID
    updateAvailabilitySlot: (_, args) => {
      return availabilityService.updateSlot(args);
    },

    // Delete a single slot by ID
    deleteAvailabilitySlot: (_, { id }) => {
      return availabilityService.deleteSlot(id);
    },

    // Wipe all slots for a user (full reset)
    clearAvailability: (_, { userId }) => {
      return availabilityService.clearAllSlots(userId);
    },
  },
};