import * as availabilityService from './service.js';

export const resolvers = {
  Query: {
    myAvailability: (_, { userId }) => {
      return availabilityService.getByUser(userId);
    },

    userAvailability: (_, { userId }) => {
      return availabilityService.getByUser(userId);
    },

    availabilitySlot: (_, { id }) => {
      return availabilityService.getById(id);
    },

    overlappingUsers: (_, { userId, date, startTime, endTime }) => {
      return availabilityService.findOverlappingUserIds({
        userId,
        date,
        startTime,
        endTime,
      });
    },

    overlappingUsersDetailed: (_, { userId, date, startTime, endTime }) => {
      return availabilityService.findOverlappingDetailed({
        userId,
        date,
        startTime,
        endTime,
      });
    },
  },

  Mutation: {
    addAvailabilitySlot: (_, args) => {
      return availabilityService.addSlot(args);
    },

    updateAvailabilitySlot: (_, args) => {
      return availabilityService.updateSlot(args);
    },

    deleteAvailabilitySlot: (_, { id }) => {
      return availabilityService.deleteSlot(id);
    },

    clearAvailability: (_, { userId }) => {
      return availabilityService.clearAllSlots(userId);
    },
  },
};