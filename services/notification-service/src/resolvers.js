import prisma from "./db.js";
import { GraphQLError } from "graphql";

const throwError = (message, statusCode = 500) => {
  const error = new GraphQLError(message, {
    extensions: {
      code: statusCode === 404 ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
    },
  });
  throw error;
};

const resolvers = {
  Query: {
    notifications: async (_, { userId }) => {
      try {
        return await prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
      } catch (error) {
        throwError("Failed to fetch notifications");
      }
    },

    unreadCount: async (_, { userId }) => {
      try {
        const count = await prisma.notification.count({
          where: { userId, read: false },
        });
        return count;
      } catch (error) {
        throwError("Failed to fetch unread count");
      }
    },
  },

  Mutation: {
    markAsRead: async (_, { notificationId }) => {
      try {
        const notification = await prisma.notification.findUnique({
          where: { id: notificationId },
        });

        if (!notification) {
          throwError("Notification not found", 404);
        }

        return await prisma.notification.update({
          where: { id: notificationId },
          data: { read: true },
        });
      } catch (error) {
        if (error.message === "Notification not found") throw error;
        throwError("Failed to mark notification as read");
      }
    },

    markAllAsRead: async (_, { userId }) => {
      try {
        await prisma.notification.updateMany({
          where: { userId, read: false },
          data: { read: true },
        });

        return await prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
      } catch (error) {
        throwError("Failed to mark all notifications as read");
      }
    },

    deleteNotification: async (_, { notificationId }) => {
      try {
        const notification = await prisma.notification.findUnique({
          where: { id: notificationId },
        });

        if (!notification) {
          throwError("Notification not found", 404);
        }

        await prisma.notification.delete({
          where: { id: notificationId },
        });

        return true;
      } catch (error) {
        if (error.message === "Notification not found") throw error;
        throwError("Failed to delete notification");
      }
    },
  },
};

export default resolvers;
