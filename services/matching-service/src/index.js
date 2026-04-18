require("dotenv").config();

const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");

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
  disconnect,
} = createKafkaPublisher();

const server = new ApolloServer({ typeDefs, resolvers });

const run = async () => {
  const consumer = await startConsumer({ matchThreshold, limit: matchLimit });

  const { url } = await startStandaloneServer(server, {
    listen: { port: parseInt(process.env.PORT, 10) || 4004 },
    context: async () => ({
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
    }),
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