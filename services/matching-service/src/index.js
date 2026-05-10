require("dotenv").config();

const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { parse } = require("cookie");
const jwt = require("jsonwebtoken");

const prisma = require("./db");
const { typeDefs } = require("./schema");
const { resolvers } = require("./resolvers");
const { createKafkaPublisher } = require("./kafka");
const { startConsumer, publishMatchesForUser } = require("./consumer");

const matchThreshold = Number(process.env.MATCH_EVENT_THRESHOLD || 50);
const matchLimit = Number(process.env.MATCH_EVENT_LIMIT || 1000);

const {
  publishMatchIdentified,
  publishMatchCandidatesUpdated,
  publishBuddyRequestCreated,
  publishBuddyRequestAccepted,
  disconnect,
} = createKafkaPublisher();

const server = new ApolloServer({ typeDefs, resolvers });

const run = async () => {
  const consumer = await startConsumer({ matchThreshold, limit: matchLimit });

  const { url } = await startStandaloneServer(server, {
    listen: { port: parseInt(process.env.PORT, 10) || 4004 },
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
        const headerUserId =
          req?.headers?.["x-user-id"] || req?.headers?.["user-id"];
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
  });

  console.log(`Matching Service ready at ${url}`);

  const shutdown = async () => {
    if (consumer) await consumer.disconnect();
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