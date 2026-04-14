
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { parse } from "cookie";
import jwt from "jsonwebtoken";
import typeDefs from "./schema.js";
import { resolvers } from "./resolvers.js";
import kafkaModule from "./kafka.js";
const {createKafkaPublisher} = kafkaModule;
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

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (error) => {
    console.error("GraphQL Error:", error);
    return error;
  },
});

const {
  publishStudySessionCreated,
  publishStudySessionJoined,
  publishStudySessionCancelled,
  disconnect: disconnectProducer,
} = createKafkaPublisher();

const run = async () => {
  const { url } = await startStandaloneServer(server, {
    listen: { port: parseInt(process.env.PORT || "4005", 10) },
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
  });

  console.log(`
╔════════════════════════════════════════╗
║   🚀 Session Service Ready             ║
║   📍 ${url}                    ║
╚════════════════════════════════════════╝
  `);
};

const shutdown = async () => {
  console.log("\n⏳ Shutting down gracefully...");
  try {
    await disconnectProducer();
    await prisma.$disconnect();
    console.log("✓ Shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("✗ Shutdown error:", error);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run().catch((error) => {
  console.error("Failed to start session service:", error);
  process.exit(1);
});
