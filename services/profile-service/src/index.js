require("dotenv").config();

const express = require("express");
const http = require("http");
const { json } = require("express");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express4");
const cors = require("cors");
const prisma = require("./db");
const resolversMap = require("./resolvers");
const { typeDefs } = require("./schema");
const {
  createKafkaPublisher,
  createUserCreatedConsumer,
} = require("./kafka");

const resolversWithScalars = {
  ...resolversMap,
  Profile: {
    createdAt: (p) => p.createdAt.toISOString(),
    updatedAt: (p) => p.updatedAt.toISOString(),
  },
};

const { publishUserPreferencesUpdated, disconnect: disconnectProducer } =
  createKafkaPublisher();

const run = async () => {
  const app = express();
  const httpServer = http.createServer(app);

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "profile-service" }));

  const server = new ApolloServer({
    typeDefs,
    resolvers: resolversWithScalars,
    csrfPrevention: false,
  });

  await server.start();

  app.use(
    "/",
    cors({ origin: true, credentials: true }),
    json(),
    expressMiddleware(server, {
      context: async () => ({
        publishUserPreferencesUpdated,
      }),
    })
  );

  // Kafka consumer — non-blocking
  const consumer = createUserCreatedConsumer();
  if (consumer) {
    try {
      await consumer.connect();
      await consumer.subscribe({ topic: "user-created", fromBeginning: true });
      console.log("[profile-service][kafka][subscribed] topic=user-created");

      await consumer.run({
        eachMessage: async ({ topic, message }) => {
          if (topic === "user-created") {
            const raw = message.value?.toString();
            if (!raw) return;

            const parsed = JSON.parse(raw);
            const userId = parsed?.payload?.userId || parsed?.payload?.id || parsed?.userId || parsed?.id;
            const correlationId = parsed?.correlationId || "n/a";

            console.log(
              `[profile-service][kafka][consumed] topic=${topic} userId=${userId || "unknown"} correlationId=${correlationId}`
            );

            if (!userId) return;
            await prisma.profile.upsert({
              where: { userId },
              create: { userId },
              update: {},
            });
            console.log(`Profile ensured for user ${userId}`);
          }
        },
      });
    } catch (err) {
      console.warn("Kafka consumer not available — running without events:", err.message);
    }
  } else {
    console.log("SKIP_KAFKA_CONSUMER=true — not subscribing to user-created");
  }

  const port = parseInt(process.env.PORT, 10) || 4002;
  await new Promise((resolve) => httpServer.listen({ port }, resolve));
  console.log(`Profile Service ready at http://localhost:${port}`);

  const shutdown = async () => {
    if (consumer) {
      try { await consumer.disconnect(); } catch {}
    }
    await disconnectProducer();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

run().catch((err) => {
  console.error("Failed to start profile-service:", err);
  process.exit(1);
});
