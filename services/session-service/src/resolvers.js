import { GraphQLError } from "graphql";
import prisma from "./db.js";

const authError = () =>
  new GraphQLError("Not authenticated", {
    extensions: { code: "UNAUTHENTICATED" },
  });

const ensureAuthenticated = (context) => {
  if (!context.authUser?.id) {
    throw authError();
  }
  return context.authUser.id;
};

export const resolvers = {
  Query: {
    health: () => "session-service:ok",

    getSession: async (_, { id }) => {
      const session = await prisma.studySession.findUnique({
        where: { id },
        include: {
          participants: {
            orderBy: { joinedAt: "asc" },
          },
        },
      });

      if (!session) {
        throw new GraphQLError("Session not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      return formatSession(session);
    },

    getMySessions: async (_, __, context) => {
      const userId = ensureAuthenticated(context);

      const sessions = await prisma.studySession.findMany({
        where: {
          OR: [
            { creatorId: userId },
            {
              participants: {
                some: { userId },
              },
            },
          ],
        },
        include: {
          participants: {
            orderBy: { joinedAt: "asc" },
          },
        },
        orderBy: { date: "asc" },
      });

      return sessions.map(formatSession);
    },

    getUpcomingSessions: async (_, { limit = 10 }) => {
      const now = new Date();

      const sessions = await prisma.studySession.findMany({
        where: {
          date: {
            gte: now,
          },
          status: "SCHEDULED",
        },
        include: {
          participants: {
            orderBy: { joinedAt: "asc" },
          },
        },
        orderBy: { date: "asc" },
        take: limit,
      });

      return sessions.map(formatSession);
    },
  },

  Mutation: {
    createSession: async (_, { input }, context) => {
      const userId = ensureAuthenticated(context);
      const { topic, description, date, duration, type } = input;

      // Validate input
      if (duration <= 0 || duration > 480) {
        throw new GraphQLError("Duration must be between 1 and 480 minutes", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const sessionDate = new Date(date);
      if (sessionDate <= new Date()) {
        throw new GraphQLError("Session date must be in the future", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // Create session and add creator as first participant atomically
      const session = await prisma.studySession.create({
        data: {
          topic,
          description,
          date: sessionDate,
          duration,
          type,
          creatorId: userId,
          creatorEmail: context.authUser?.email || context.userEmail || null,
          creatorPhoneNumber: context.userPhone || null,
          participants: {
            create: {
              userId,
              role: "CREATOR",
            },
          },
        },
        include: {
          participants: {
            orderBy: { joinedAt: "asc" },
          },
        },
      });

      // Publish Kafka event
      await context.publishStudySessionCreated(userId, {
        sessionId: session.id,
        topic: session.topic,
        date: session.date.toISOString(),
        type: session.type,
        creatorId: userId,
      });

      return formatSession(session);
    },

    joinSession: async (_, { sessionId }, context) => {
      const userId = ensureAuthenticated(context);

      // Verify session exists and get current state
      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: {
          participants: true,
        },
      });

      if (!session) {
        throw new GraphQLError("Session not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      // Validate session can be joined
      if (session.status === "CANCELLED") {
        throw new GraphQLError("Cannot join a cancelled session", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      if (session.status === "COMPLETED") {
        throw new GraphQLError("Cannot join a completed session", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // Check if user is already a participant
      const isParticipant = session.participants.some(
        (p) => p.userId === userId
      );

      if (isParticipant) {
        throw new GraphQLError("User is already a participant in this session", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // Add user as participant
      const updated = await prisma.studySession.update({
        where: { id: sessionId },
        data: {
          participants: {
            create: {
              userId,
              role: "PARTICIPANT",
            },
          },
        },
        include: {
          participants: {
            orderBy: { joinedAt: "asc" },
          },
        },
      });

      // Publish Kafka event
      await context.publishStudySessionJoined(userId, {
        sessionId: session.id,
        userId,
        creatorId: session.creatorId,
        topic:session.topic
      });

      return formatSession(updated);
    },

    leaveSession: async (_, { sessionId }, context) => {
      const userId = ensureAuthenticated(context);

      // Get session and check participation
      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: {
          participants: true,
        },
      });

      if (!session) {
        throw new GraphQLError("Session not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      const participant = session.participants.find((p) => p.userId === userId);

      if (!participant) {
        throw new GraphQLError("User is not a participant in this session", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      // Prevent creator from leaving
      if (participant.role === "CREATOR") {
        throw new GraphQLError(
          "Session creator cannot leave. Cancel the session instead.",
          { extensions: { code: "BAD_USER_INPUT" } }
        );
      }

      // Remove participant
      const updated = await prisma.studySession.update({
        where: { id: sessionId },
        data: {
          participants: {
            delete: {
              id: participant.id,
            },
          },
        },
        include: {
          participants: {
            orderBy: { joinedAt: "asc" },
          },
        },
      });

      return formatSession(updated);
    },

    cancelSession: async (_, { sessionId }, context) => {
      const userId = ensureAuthenticated(context);

      // Get session and verify creator
      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new GraphQLError("Session not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (session.creatorId !== userId) {
        throw new GraphQLError(
          "Only the session creator can cancel the session",
          { extensions: { code: "FORBIDDEN" } }
        );
      }

      if (session.status !== "SCHEDULED") {
        throw new GraphQLError(
          `Cannot cancel a ${session.status.toLowerCase()} session`,
          { extensions: { code: "BAD_USER_INPUT" } }
        );
      }

      // Update status
      const updated = await prisma.studySession.update({
        where: { id: sessionId },
        data: {
          status: "CANCELLED",
        },
        include: {
          participants: {
            orderBy: { joinedAt: "asc" },
          },
        },
      });

      // Publish Kafka event
      await context.publishStudySessionCancelled(userId, {
        sessionId: session.id,
        creatorId: session.creatorId,
      });

      return formatSession(updated);
    },

    completeSession: async (_, { sessionId }, context) => {
      const userId = ensureAuthenticated(context);

      // Get session and verify creator
      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new GraphQLError("Session not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (session.creatorId !== userId) {
        throw new GraphQLError(
          "Only the session creator can mark session as completed",
          { extensions: { code: "FORBIDDEN" } }
        );
      }

      if (session.status !== "SCHEDULED") {
        throw new GraphQLError(
          "Only scheduled sessions can be marked as completed",
          { extensions: { code: "BAD_USER_INPUT" } }
        );
      }

      // Update status
      const updated = await prisma.studySession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
        },
        include: {
          participants: {
            orderBy: { joinedAt: "asc" },
          },
        },
      });

      return formatSession(updated);
    },
  },
};

// Helper to format session with ISO strings
function formatSession(session) {
  return {
    ...session,
    date: session.date.toISOString(),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    participantCount: session.participants?.length || 0,
    participants: (session.participants || []).map((p) => ({
      ...p,
      joinedAt: p.joinedAt.toISOString(),
    })),
  };
}

export default resolvers;
