import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { parse } from "cookie";
import jwt from "jsonwebtoken";

import prisma from "./db.js";
import typeDefs from "./schema.js";
import { resolvers } from "./resolvers.js";
import { createKafkaPublisher } from "./kafka.js";
import { startConsumer, publishMatchesForUser } from "./consumer.js";

const matchThreshold = Number(process.env.MATCH_EVENT_THRESHOLD || 50);
const matchLimit = Number(process.env.MATCH_EVENT_LIMIT || 1000);

const {
  publishMatchIdentified,
  publishMatchCandidatesUpdated,
  publishBuddyRequestCreated,
  publishBuddyRequestAccepted,
  disconnect,
} = createKafkaPublisher();

const run = async () => {
  const app = express();
  const httpServer = http.createServer(app);

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "matching-service" }));

  const server = new ApolloServer({ typeDefs, resolvers, csrfPrevention: false, introspection: true });
  await server.start();

  app.use(
    "/",
    cors({ origin: true, credentials: true }),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const cookieHeader = req?.headers?.cookie || "";
        const cookies = parse(cookieHeader);
        const authHeader = req?.headers?.authorization || "";
        const token =
          cookies.token ||
          (authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null);
        let authUser = null;

        if (token && process.env.JWT_SECRET) {
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded?.id) {
              authUser = { id: String(decoded.id), email: decoded.email || null };
            }
          } catch {
            authUser = null;
          }
        }

        if (!authUser) {
          const headerUserId = req?.headers?.["x-user-id"] || req?.headers?.["user-id"];
          if (headerUserId) {
            authUser = {
              id: String(headerUserId),
              email: req?.headers?.["x-user-email"] || null,
            };
          }
        }

        return {
          authUser,
          publishMatches: async (userId, candidates) => {
            for (const candidate of candidates) {
              await publishMatchIdentified(userId, candidate);
            }
            await publishMatchCandidatesUpdated(userId, candidates, matchThreshold);
          },
          publishTopMatchesForUser: async (userId) => {
            await publishMatchesForUser(
              userId,
              publishMatchIdentified,
              matchLimit,
              matchThreshold,
              publishMatchCandidatesUpdated
            );
          },
          publishBuddyRequestCreated,
          publishBuddyRequestAccepted,
        };
      },
    })
  );

  // Kafka consumer — non-blocking
  let consumer = null;
  try {
    consumer = await startConsumer({ matchThreshold, limit: matchLimit });
  } catch (err) {
    console.warn("Kafka consumer not available:", err.message);
  }

  const port = parseInt(process.env.PORT, 10) || 4004;
  await new Promise((resolve) => httpServer.listen({ port }, resolve));
  console.log(`Matching Service ready at http://localhost:${port}`);

  const shutdown = async () => {
    if (consumer) {
      try { await consumer.disconnect(); } catch {}
    }
    await disconnect();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

run().catch((error) => {
  console.error("matching-service failed to start", error);
  process.exit(1);
});
