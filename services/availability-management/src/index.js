import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs }  from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import { connectProducer, disconnectProducer } from './kafka/producer.js';
import { startConsumer, disconnectConsumer }   from './kafka/consumer.js';
import prisma from './db/client.js';
import 'dotenv/config';

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async () => {
  console.log('\n🛑 Shutting down availability service...');
  await disconnectProducer();
  await disconnectConsumer();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);

// ─── Boot ─────────────────────────────────────────────────────────────────────
const start = async () => {
  // 1. verify DB connection
  await prisma.$connect();
  console.log('✅ Connected to NeonDB via Prisma');

  // 2. connect Kafka producer
  await connectProducer();

  // 3. start Kafka consumer
  await startConsumer();

  // 4. start Apollo GraphQL server
  const server = new ApolloServer({ typeDefs, resolvers });
  const { url } = await startStandaloneServer(server, {
    listen: { port: Number(process.env.PORT) || 4002 },
  });

  console.log(`🚀 Availability service ready at ${url}`);
};

start().catch((err) => {
  console.error('❌ Failed to start availability service:', err);
  process.exit(1);
});