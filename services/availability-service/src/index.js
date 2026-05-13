import express from 'express';
import http from 'http';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs }  from './schema.js';
import { resolvers } from './resolvers.js';
import { connectProducer, disconnectProducer } from './kafka/producer.js';
import { startConsumer, disconnectConsumer }   from './kafka/consumer.js';
import prisma from './db.js';
import 'dotenv/config';

const start = async () => {
  await prisma.$connect();
  console.log('Connected to DB via Prisma');

  const app = express();
  const httpServer = http.createServer(app);

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'availability-service' }));

  const server = new ApolloServer({ typeDefs, resolvers, csrfPrevention: false, introspection: true });
  await server.start();

  app.use(
    '/',
    cors({ origin: true, credentials: true }),
    express.json(),
    expressMiddleware(server)
  );

  // Kafka — non-blocking
  try {
    await connectProducer();
  } catch (err) {
    console.warn('Kafka producer not available:', err.message);
  }
  try {
    await startConsumer();
  } catch (err) {
    console.warn('Kafka consumer not available:', err.message);
  }

  const port = Number(process.env.PORT) || 4003;
  await new Promise((resolve) => httpServer.listen({ port }, resolve));
  console.log(`Availability service ready at http://localhost:${port}`);

  const shutdown = async () => {
    console.log('\nShutting down availability service...');
    await disconnectProducer();
    await disconnectConsumer();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT',  shutdown);
  process.on('SIGTERM', shutdown);
};

start().catch((err) => {
  console.error('Failed to start availability service:', err);
  process.exit(1);
});
