import dotenv from "dotenv";
import { ApolloServer } from "apollo-server";

import { typeDefs } from "./graphql/typeDefs.js";
import { resolvers } from "./graphql/resolvers.js";
import { buildContext } from "./graphql/context.js";
import { connectProducer, disconnectProducer } from "./config/kafka.js";
import prisma from "./config/prisma.js";

dotenv.config();

const PORT = Number(process.env.PORT || 4001);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req, res }) => buildContext(req, res),
});

const start = async () => {
  await connectProducer();

  const { url } = await server.listen({
    port: PORT,
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
      credentials: true,
    },
  });

  console.log(`User Service GraphQL ready at ${url}`);
};

const shutdown = async (signal) => {
  console.log(`\n${signal} received - shutting down user-service`);
  await server.stop();
  await disconnectProducer();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();
