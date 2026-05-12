import { GraphQLError } from "graphql";
import prisma from "./db.js";
import { canJoinCreatorSession } from "./matchState.js";

const MATCHING_SERVICE_URL =
  process.env.MATCHING_SERVICE_URL || "http://matching-service:4004/graphql";

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

async function areBuddies(userId, buddyId) {
  if (!userId || !buddyId) return false;

  try {
    const response = await fetch(MATCHING_SERVICE_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query: "query AreBuddies($userId: String!, $buddyId: String!) { areBuddies(userId: $userId, buddyId: $buddyId) }",
        variables: { userId, buddyId },
      }),
    });

    const payload = await response.json();
    return Boolean(payload?.data?.areBuddies);
  } catch (error) {
    console.warn(
      `[session-service] buddy lookup failed: ${error.message || error}`
    );
    return false;
  }
}

async function hasMinMatchScore(userId, targetId, minScore = 50) {
  if (!userId || !targetId) return false;
  try {
    const response = await fetch(MATCHING_SERVICE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: `query CheckMatch($userId: String!, $minScore: Int) {
          recommendedBuddies(userId: $userId, limit: 100, minScore: $minScore) {
            userId
            score
          }
        }`,
        variables: { userId, minScore },
      }),
    });
    const payload = await response.json();
    const candidates = payload?.data?.recommendedBuddies || [];
    return candidates.some((c) => c.userId === targetId);
  } catch (error) {
    console.warn(`[session-service] match score lookup failed: ${error.message || error}`);
    return false;
  }
}

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

    getMySessionInvites: async (_, __, context) => {
      const userId = ensureAuthenticated(context);

      const invites = await prisma.sessionInvite.findMany({
        where: { invitedUserId: userId },
        include: {
          session: {
            include: {
              participants: { orderBy: { joinedAt: "asc" } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return invites.map(formatInvite);
    },

    getSessionInvites: async (_, { sessionId }, context) => {
      const userId = ensureAuthenticated(context);

      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new GraphQLError("Session not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (session.creatorId !== userId) {
        throw new GraphQLError("Only the session creator can view invites", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const invites = await prisma.sessionInvite.findMany({
        where: { sessionId },
        include: {
          session: {
            include: {
              participants: { orderBy: { joinedAt: "asc" } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return invites.map(formatInvite);
    },

    getMyJoinRequests: async (_, __, context) => {
      const userId = ensureAuthenticated(context);

      const requests = await prisma.sessionJoinRequest.findMany({
        where: { requesterId: userId },
        include: {
          session: {
            include: {
              participants: { orderBy: { joinedAt: "asc" } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return requests.map(formatJoinRequest);
    },

    getSessionJoinRequests: async (_, { sessionId }, context) => {
      const userId = ensureAuthenticated(context);

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
          "Only the session creator can view join requests",
          { extensions: { code: "FORBIDDEN" } }
        );
      }

      const requests = await prisma.sessionJoinRequest.findMany({
        where: { sessionId },
        include: {
          session: {
            include: {
              participants: { orderBy: { joinedAt: "asc" } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return requests.map(formatJoinRequest);
    },
  },

  Mutation: {
    createSession: async (_, { input }, context) => {
      const userId = ensureAuthenticated(context);
      const { topic, description, date, duration, type, location } = input;

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
          location: location || null,
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

    updateSession: async (_, { sessionId, input }, context) => {
      const userId = ensureAuthenticated(context);

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
          "Only the session creator can update the session",
          { extensions: { code: "FORBIDDEN" } }
        );
      }

      if (session.status !== "SCHEDULED") {
        throw new GraphQLError(
          "Only scheduled sessions can be updated",
          { extensions: { code: "BAD_USER_INPUT" } }
        );
      }

      const updates = {};
      if (input.topic !== undefined) updates.topic = input.topic;
      if (input.description !== undefined) updates.description = input.description;
      if (input.type !== undefined) updates.type = input.type;
      if (input.location !== undefined) updates.location = input.location;

      if (input.duration !== undefined) {
        if (input.duration <= 0 || input.duration > 480) {
          throw new GraphQLError("Duration must be between 1 and 480 minutes", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        updates.duration = input.duration;
      }

      if (input.date !== undefined) {
        const sessionDate = new Date(input.date);
        if (sessionDate <= new Date()) {
          throw new GraphQLError("Session date must be in the future", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        }
        updates.date = sessionDate;
      }

      const updated = await prisma.studySession.update({
        where: { id: sessionId },
        data: updates,
        include: {
          participants: {
            orderBy: { joinedAt: "asc" },
          },
        },
      });

      return formatSession(updated);
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

      const buddyAllowed =
        (await areBuddies(userId, session.creatorId)) ||
        (await hasMinMatchScore(userId, session.creatorId, 50)) ||
        canJoinCreatorSession(userId, session.creatorId);

      if (!buddyAllowed) {
        throw new GraphQLError(
          "You can only join sessions created by your buddies",
          { extensions: { code: "FORBIDDEN" } }
        );
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

      const invite = await prisma.sessionInvite.findUnique({
        where: {
          sessionId_invitedUserId: {
            sessionId,
            invitedUserId: userId,
          },
        },
      });

      if (!invite || invite.status !== "PENDING") {
        throw new GraphQLError(
          "This session requires an invite or approval before joining",
          { extensions: { code: "FORBIDDEN" } }
        );
      }

      const updated = await prisma.studySession.update({
        where: { id: sessionId },
        data: {
          participants: {
            create: {
              userId,
              role: "PARTICIPANT",
            },
          },
          invites: {
            update: {
              where: { id: invite.id },
              data: { status: "ACCEPTED", respondedAt: new Date() },
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

    inviteToSession: async (_, { sessionId, userId: invitedUserId }, context) => {
      const userId = ensureAuthenticated(context);

      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true },
      });

      if (!session) {
        throw new GraphQLError("Session not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (session.creatorId !== userId) {
        throw new GraphQLError(
          "Only the session creator can invite buddies",
          { extensions: { code: "FORBIDDEN" } }
        );
      }

      if (session.status !== "SCHEDULED") {
        throw new GraphQLError(
          "Only scheduled sessions can be invited to",
          { extensions: { code: "BAD_USER_INPUT" } }
        );
      }

      if (invitedUserId === userId) {
        throw new GraphQLError("Cannot invite yourself", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const isAlreadyParticipant = session.participants.some(
        (p) => p.userId === invitedUserId
      );

      if (isAlreadyParticipant) {
        throw new GraphQLError("User is already a participant", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const isMatchedBuddy =
        (await hasMinMatchScore(userId, invitedUserId, 50)) ||
        canJoinCreatorSession(invitedUserId, userId);

      if (!isMatchedBuddy) {
        throw new GraphQLError(
          "You can only invite users with a match score of 50% or higher",
          { extensions: { code: "FORBIDDEN" } }
        );
      }

      const existing = await prisma.sessionInvite.findUnique({
        where: {
          sessionId_invitedUserId: {
            sessionId,
            invitedUserId,
          },
        },
      });

      let invite;
      if (existing) {
        invite = await prisma.sessionInvite.update({
          where: { id: existing.id },
          data: { status: "PENDING", respondedAt: null },
        });
      } else {
        invite = await prisma.sessionInvite.create({
          data: {
            sessionId,
            invitedUserId,
            invitedById: userId,
          },
        });
      }

      return formatInvite(
        await prisma.sessionInvite.findUnique({
          where: { id: invite.id },
          include: {
            session: {
              include: {
                participants: { orderBy: { joinedAt: "asc" } },
              },
            },
          },
        })
      );
    },

    respondToSessionInvite: async (_, { inviteId, accept }, context) => {
      const userId = ensureAuthenticated(context);

      const invite = await prisma.sessionInvite.findUnique({
        where: { id: inviteId },
        include: {
          session: {
            include: { participants: { orderBy: { joinedAt: "asc" } } },
          },
        },
      });

      if (!invite) {
        throw new GraphQLError("Invite not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (invite.invitedUserId !== userId) {
        throw new GraphQLError("Not authorized to respond to this invite", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      if (invite.status !== "PENDING") {
        throw new GraphQLError("Invite has already been processed", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      if (!accept) {
        const updated = await prisma.sessionInvite.update({
          where: { id: inviteId },
          data: { status: "DECLINED", respondedAt: new Date() },
          include: {
            session: {
              include: { participants: { orderBy: { joinedAt: "asc" } } },
            },
          },
        });
        return formatInvite(updated);
      }

      const isParticipant = invite.session.participants.some(
        (p) => p.userId === userId
      );

      const updatedInvite = await prisma.sessionInvite.update({
        where: { id: inviteId },
        data: { status: "ACCEPTED", respondedAt: new Date() },
        include: {
          session: {
            include: { participants: { orderBy: { joinedAt: "asc" } } },
          },
        },
      });

      if (!isParticipant) {
        await prisma.sessionParticipant.create({
          data: {
            sessionId: invite.sessionId,
            userId,
            role: "PARTICIPANT",
          },
        });
      }

      return formatInvite(updatedInvite);
    },

    requestToJoinSession: async (_, { sessionId }, context) => {
      const userId = ensureAuthenticated(context);

      const session = await prisma.studySession.findUnique({
        where: { id: sessionId },
        include: { participants: true },
      });

      if (!session) {
        throw new GraphQLError("Session not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (session.creatorId === userId) {
        throw new GraphQLError("Session creator is already participating", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      if (session.status !== "SCHEDULED") {
        throw new GraphQLError("Cannot request to join this session", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const isParticipant = session.participants.some(
        (p) => p.userId === userId
      );
      if (isParticipant) {
        throw new GraphQLError("User is already a participant", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const invite = await prisma.sessionInvite.findUnique({
        where: {
          sessionId_invitedUserId: {
            sessionId,
            invitedUserId: userId,
          },
        },
      });

      if (invite?.status === "PENDING") {
        throw new GraphQLError("You have already been invited to this session", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const buddyAllowed =
        (await hasMinMatchScore(userId, session.creatorId, 50)) ||
        canJoinCreatorSession(userId, session.creatorId);

      if (!buddyAllowed) {
        throw new GraphQLError(
          "You can only request to join sessions created by your buddies",
          { extensions: { code: "FORBIDDEN" } }
        );
      }

      const existing = await prisma.sessionJoinRequest.findUnique({
        where: {
          sessionId_requesterId: {
            sessionId,
            requesterId: userId,
          },
        },
      });

      let request;
      if (existing) {
        request = await prisma.sessionJoinRequest.update({
          where: { id: existing.id },
          data: { status: "PENDING", respondedAt: null },
        });
      } else {
        request = await prisma.sessionJoinRequest.create({
          data: {
            sessionId,
            requesterId: userId,
          },
        });
      }

      return formatJoinRequest(
        await prisma.sessionJoinRequest.findUnique({
          where: { id: request.id },
          include: {
            session: {
              include: {
                participants: { orderBy: { joinedAt: "asc" } },
              },
            },
          },
        })
      );
    },

    respondToJoinRequest: async (_, { requestId, approve }, context) => {
      const userId = ensureAuthenticated(context);

      const request = await prisma.sessionJoinRequest.findUnique({
        where: { id: requestId },
        include: {
          session: {
            include: { participants: { orderBy: { joinedAt: "asc" } } },
          },
        },
      });

      if (!request) {
        throw new GraphQLError("Join request not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (request.session.creatorId !== userId) {
        throw new GraphQLError("Only the session creator can review requests", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      if (request.status !== "PENDING") {
        throw new GraphQLError("Join request has already been processed", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      if (!approve) {
        const updated = await prisma.sessionJoinRequest.update({
          where: { id: requestId },
          data: {
            status: "DECLINED",
            respondedAt: new Date(),
            reviewedById: userId,
          },
          include: {
            session: {
              include: { participants: { orderBy: { joinedAt: "asc" } } },
            },
          },
        });
        return formatJoinRequest(updated);
      }

      const isParticipant = request.session.participants.some(
        (p) => p.userId === request.requesterId
      );

      if (!isParticipant) {
        await prisma.sessionParticipant.create({
          data: {
            sessionId: request.sessionId,
            userId: request.requesterId,
            role: "PARTICIPANT",
          },
        });
      }

      const updated = await prisma.sessionJoinRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          respondedAt: new Date(),
          reviewedById: userId,
        },
        include: {
          session: {
            include: { participants: { orderBy: { joinedAt: "asc" } } },
          },
        },
      });

      return formatJoinRequest(updated);
    },

    cancelJoinRequest: async (_, { requestId }, context) => {
      const userId = ensureAuthenticated(context);

      const request = await prisma.sessionJoinRequest.findUnique({
        where: { id: requestId },
        include: {
          session: {
            include: { participants: { orderBy: { joinedAt: "asc" } } },
          },
        },
      });

      if (!request) {
        throw new GraphQLError("Join request not found", {
          extensions: { code: "NOT_FOUND" },
        });
      }

      if (request.requesterId !== userId) {
        throw new GraphQLError("Not authorized to cancel this request", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      if (request.status !== "PENDING") {
        throw new GraphQLError("Only pending requests can be cancelled", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }

      const updated = await prisma.sessionJoinRequest.update({
        where: { id: requestId },
        data: {
          status: "CANCELLED",
          respondedAt: new Date(),
        },
        include: {
          session: {
            include: { participants: { orderBy: { joinedAt: "asc" } } },
          },
        },
      });

      return formatJoinRequest(updated);
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
    location: session.location || null,
    participants: (session.participants || []).map((p) => ({
      ...p,
      joinedAt: p.joinedAt.toISOString(),
    })),
  };
}

function formatInvite(invite) {
  if (!invite) return null;
  return {
    ...invite,
    createdAt: invite.createdAt.toISOString(),
    respondedAt: invite.respondedAt ? invite.respondedAt.toISOString() : null,
    session: invite.session ? formatSession(invite.session) : null,
  };
}

function formatJoinRequest(request) {
  if (!request) return null;
  return {
    ...request,
    createdAt: request.createdAt.toISOString(),
    respondedAt: request.respondedAt ? request.respondedAt.toISOString() : null,
    session: request.session ? formatSession(request.session) : null,
  };
}

export default resolvers;
