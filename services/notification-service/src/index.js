import "dotenv/config.js";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import typeDefs from "./schema.js";
import resolvers from "./resolvers.js";
import prisma from "./db.js";
import { createNotificationConsumer, subscribeToEvents } from "./kafka.js";

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const consumer = createNotificationConsumer();

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

      case "MatchFound":
        // Notify user about a new match
        await prisma.notification.create({
          data: {
            userId: payload.userId,
            type: "match_found",
            title: "New Study Buddy Match",
            message: `You have a new study buddy match: ${payload.matchName}. Compatibility: ${payload.compatibilityScore}%`,
            relatedId: payload.matchId,
          },
        });
        console.log(`Match notification for user ${payload.userId}`);
        break;

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
  if (consumer) {
    await consumer.connect();
    await subscribeToEvents(consumer, handleNotificationEvent);
  } else {
    console.log("SKIP_KAFKA_CONSUMER=true — not subscribing to events");
  }

  const { url } = await startStandaloneServer(server, {
    listen: { port: parseInt(process.env.PORT, 10) || 4003 },
  });

  console.log(`🚀 Notification Service ready at ${url}`);
};

const shutdown = async () => {
  if (consumer) {
    await consumer.disconnect();
  }
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run().catch(console.error);
