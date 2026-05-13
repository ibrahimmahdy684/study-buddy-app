import "dotenv/config.js";
import express from "express";
import http from "http";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import typeDefs from "./schema.js";
import resolvers from "./resolvers.js";
import prisma from "./db.js";
import { createNotificationConsumer, subscribeToEvents } from "./kafka.js";

const handleNotificationEvent = async (topic, event) => {
  const { payload } = event;

  try {
    switch (topic) {
      case "UserPreferencesUpdated":
        // User updated their preferences - can create a notification if needed
        console.log(`User ${payload.userId} updated preferences`);
        break;

      case "BuddyRequestCreated":
        await prisma.notification.create({
          data: {
            userId: payload.receiverId,
            type: "buddy_request",
            title: "New Buddy Request",
            message: `You received a study buddy request from ${payload.senderName}`,
            relatedId: payload.requestId,
          },
        });
        console.log(`Notification created for user ${payload.receiverId}`);
        break;

      case "BuddyRequestAccepted":
        await prisma.notification.create({
          data: {
            userId: payload.buddyId,
            type: "buddy_request_accepted",
            title: "Buddy Request Accepted",
            message: "Your study buddy request was accepted",
            relatedId: payload.requestId,
          },
        });
        console.log(`Buddy request accepted notification for ${payload.buddyId}`);
        break;

      case "StudySessionCreated":
        // Notify the session creator
        await prisma.notification.create({
          data: {
            userId: payload.creatorId,
            type: "session_created",
            title: "Study Session Created",
            message: `Your study session on "${payload.topic}" has been created`,
            relatedId: payload.sessionId,
          },
        });
        console.log(`Session creation notification for ${payload.creatorId}`);
        break;

      case "StudySessionJoined":
        // Notify the session creator that someone joined
        await prisma.notification.create({
          data: {
            userId: payload.sessionCreatorId,
            type: "session_joined",
            title: "Study Session Joined",
            message: `${payload.participantName} joined your study session on "${payload.topic}"`,
            relatedId: payload.sessionId,
          },
        });
        console.log(
          `Session join notification for ${payload.sessionCreatorId}`,
        );
        break;

      case "MatchFound": {
        const candidate = payload.candidate || {};
        await prisma.notification.create({
          data: {
            userId: payload.userId,
            type: "match_found",
            title: "New Study Buddy Match",
            message: `You have a new study buddy match! Compatibility score: ${candidate.score ?? 0}%`,
            relatedId: candidate.userId || null,
          },
        });
        console.log(`Match notification for user ${payload.userId}`);
        break;
      }

      case "MessageSent":
        await prisma.notification.create({
          data: {
            userId: payload.receiverId,
            type: "message_received",
            title: "New Message",
            message: `You received a new message from ${payload.senderId}: ${payload.messagePreview}`,
            relatedId: payload.conversationId,
          },
        });
        console.log(`Message notification for user ${payload.receiverId}`);
        break;

      default:
        console.log(`Unknown event topic: ${topic}`);
    }
  } catch (error) {
    console.error(`Error handling event ${topic}:`, error);
  }
};

const run = async () => {
  const app = express();
  const httpServer = http.createServer(app);

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "notification-service" }));

  const server = new ApolloServer({ typeDefs, resolvers, csrfPrevention: false });
  await server.start();

  app.use(
    "/",
    cors({ origin: true, credentials: true }),
    express.json(),
    expressMiddleware(server)
  );

  // Kafka consumer — non-blocking
  const consumer = createNotificationConsumer();
  if (consumer) {
    try {
      await consumer.connect();
      await subscribeToEvents(consumer, handleNotificationEvent);
    } catch (err) {
      console.warn("Kafka consumer not available — running without events:", err.message);
    }
  } else {
    console.log("SKIP_KAFKA_CONSUMER=true — not subscribing to events");
  }

  const port = parseInt(process.env.PORT, 10) || 4006;
  await new Promise((resolve) => httpServer.listen({ port }, resolve));
  console.log(`Notification Service ready at http://localhost:${port}`);

  const shutdown = async () => {
    if (consumer) {
      try { await consumer.disconnect(); } catch {}
    }
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

run().catch((err) => {
  console.error("Failed to start notification-service:", err);
  process.exit(1);
});
