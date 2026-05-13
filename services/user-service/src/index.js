import dotenv from "dotenv";
import express from "express";
import http from "http";
import cors from "cors";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./graphql/typeDefs.js";
import { resolvers } from "./graphql/resolvers.js";
import { buildContext } from "./graphql/context.js";
import { connectProducer, disconnectProducer } from "./config/kafka.js";
import prisma from "./config/prisma.js";

dotenv.config();

const start = async () => {
  const app = express();
  const httpServer = http.createServer(app);

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "user-service" }));

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req, res }) => buildContext(req, res),
  });

  await server.start();
  server.applyMiddleware({
    app,
    cors: {
      origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
      credentials: true,
    },
  });

  // Kafka — non-blocking
  try {
    await connectProducer();
  } catch (err) {
    console.warn("Kafka producer not available:", err.message);
  }

  const port = Number(process.env.PORT) || 4001;
  await new Promise((resolve) => httpServer.listen({ port }, resolve));
  console.log(`User Service ready at http://localhost:${port}`);

  const shutdown = async (signal) => {
    console.log(`\n${signal} received - shutting down user-service`);
    await server.stop();
    await disconnectProducer();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

start().catch((err) => {
  console.error("Failed to start user-service:", err);
  process.exit(1);
});
