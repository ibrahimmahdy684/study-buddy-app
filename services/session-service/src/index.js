
import express from "express";
import http from "http";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import { parse } from "cookie";
import jwt from "jsonwebtoken";
import typeDefs from "./schema.js";
import { resolvers } from "./resolvers.js";
import kafkaModule from "./kafka.js";
const {createKafkaPublisher} = kafkaModule;
import { createMatchConsumer, startMatchConsumer } from "./matchConsumer.js";
import prisma from "./db.js";

const extractToken = (req) => {
  const cookieHeader = req?.headers?.cookie || "";
  const cookies = parse(cookieHeader);
  if (cookies.token) return cookies.token;

  const authHeader = req?.headers?.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
};

const verifyToken = (token) => {
  if (!token || !process.env.JWT_SECRET) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

const {
  publishStudySessionCreated,
  publishStudySessionJoined,
  publishStudySessionCancelled,
  disconnect: disconnectProducer,
} = createKafkaPublisher();

const run = async () => {
  const app = express();
  const httpServer = http.createServer(app);

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "session-service" }));

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    csrfPrevention: false,
    formatError: (error) => {
      console.error("GraphQL Error:", error);
      return error;
    },
  });

  await server.start();

  app.use(
    "/",
    cors({ origin: true, credentials: true }),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({
        authUser: (() => {
          const token = extractToken(req);
          const decoded = verifyToken(token);

          if (decoded?.id) {
            return {
              id: decoded.id,
              email: decoded.email || null,
            };
          }

          const headerUserId = req?.headers?.["x-user-id"] || req?.headers?.["user-id"];
          if (headerUserId) {
            return {
              id: String(headerUserId),
              email: req?.headers?.["x-user-email"] || null,
            };
          }

          return null;
        })(),
        userEmail: req?.headers?.["x-user-email"] || null,
        userPhone: req?.headers?.["x-user-phone"] || null,
        publishStudySessionCreated,
        publishStudySessionJoined,
        publishStudySessionCancelled,
      }),
    })
  );

  // Kafka consumer — non-blocking
  const matchConsumer = createMatchConsumer();
  if (matchConsumer) {
    try {
      await startMatchConsumer(matchConsumer);
    } catch (err) {
      console.warn("Kafka match consumer not available:", err.message);
    }
  } else {
    console.log("SKIP_KAFKA_CONSUMER=true — session match consumer disabled");
  }

  const port = parseInt(process.env.PORT || "4005", 10);
  await new Promise((resolve) => httpServer.listen({ port }, resolve));
  console.log(`Session Service ready at http://localhost:${port}`);

  const shutdown = async () => {
    console.log("\nShutting down gracefully...");
    try {
      if (matchConsumer) {
        await matchConsumer.disconnect().catch(() => {});
      }
      await disconnectProducer();
      await prisma.$disconnect();
      process.exit(0);
    } catch (error) {
      console.error("Shutdown error:", error);
      process.exit(1);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

run().catch((error) => {
  console.error("Failed to start session service:", error);
  process.exit(1);
});
