require("dotenv").config();

const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
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

const server = new ApolloServer({
  typeDefs,
  resolvers: resolversWithScalars,
});

const consumer = createUserCreatedConsumer();
const { publishUserPreferencesUpdated, disconnect: disconnectProducer } =
  createKafkaPublisher();

const run = async () => {
  if (consumer) {
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
  } else {
    console.log("SKIP_KAFKA_CONSUMER=true — not subscribing to user-created");
  }

  const { url } = await startStandaloneServer(server, {
    listen: { port: parseInt(process.env.PORT, 10) || 4002 },
    context: async () => ({
      publishUserPreferencesUpdated,
    }),
  });

  console.log(`🚀 Server ready at ${url}`);
};

const shutdown = async () => {
  if (consumer) {
    await consumer.disconnect();
  }
  await disconnectProducer();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run().catch(console.error);
