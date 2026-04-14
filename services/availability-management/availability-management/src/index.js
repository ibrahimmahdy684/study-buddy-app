import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs }  from './graphql/schema.js';
import { resolvers } from './graphql/resolvers.js';
import { connectProducer, disconnectProducer } from './kafka/producer.js';
import { startConsumer, disconnectConsumer }   from './kafka/consumer.js';
import prisma from './db/client.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const shutdown = async () => {
  console.log('\n🛑 Shutting down availability service...');
  await disconnectProducer();
  await disconnectConsumer();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);

const start = async () => {
  await prisma.$connect();
  console.log('✅ Connected to NeonDB via Prisma');

  await connectProducer();
  await startConsumer();

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