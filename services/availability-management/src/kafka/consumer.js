import { Kafka } from 'kafkajs';
import 'dotenv/config';

const kafka = new Kafka({
  clientId: 'availability-service-consumer',
  brokers:  [process.env.KAFKA_BROKER],
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID });

const handlers = {
  // When a new user is created in the Auth service,
  // log it — no slots created yet, user will add their own
  'user.created': async ({ payload }) => {
    const { userId, name } = payload;
    console.log(`📥 [user.created] New user registered: ${name} (${userId})`);
    // Optionally seed default empty state or just acknowledge
  },

  // When a user is deleted, clean up their availability data
  'user.deleted': async ({ payload }) => {
    const { userId } = payload;
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.availabilitySlot.deleteMany({ where: { userId } });
    console.log(`🗑️  [user.deleted] Cleared all slots for user ${userId}`);
  },
};

export const startConsumer = async () => {
  await consumer.connect();

  // Subscribe to all relevant topics
  await consumer.subscribe({ topic: 'user.created',  fromBeginning: false });
  await consumer.subscribe({ topic: 'user.deleted',  fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        console.log(`📥 Received event on [${topic}]`, event);

        const handler = handlers[topic];
        if (handler) {
          await handler(event);
        } else {
          console.warn(`⚠️  No handler found for topic: ${topic}`);
        }
      } catch (err) {
        console.error(`❌ Failed to process message on [${topic}]:`, err.message);
      }
    },
  });

  console.log('👂 Kafka consumer listening on [user.created, user.deleted]');
};

export const disconnectConsumer = async () => {
  await consumer.disconnect();
};