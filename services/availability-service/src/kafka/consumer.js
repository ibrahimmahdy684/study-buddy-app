import { Kafka } from 'kafkajs';
import prisma from '../db.js';

const kafka = new Kafka({
  clientId: 'availability-service-consumer',
  brokers:  [process.env.KAFKA_BROKER || 'localhost:9092'],
});

let consumer;

const handlers = {
  'user.created': async ({ payload }) => {
    const { userId, name } = payload;
    console.log(`📥 [user.created] New user registered: ${name} (${userId})`);
  },

  'user.deleted': async ({ payload }) => {
    const { userId } = payload;
    await prisma.availabilitySlot.deleteMany({ where: { userId } });
    console.log(`🗑️  [user.deleted] Cleared all slots for user ${userId}`);
  },
  
};

export const startConsumer = async () => {
  try {
    consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'availability-group' });

    await consumer.connect();
    await consumer.subscribe({ topic: 'user.created', fromBeginning: false });
    await consumer.subscribe({ topic: 'user.deleted', fromBeginning: false });

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
  } catch (err) {
    console.warn('⚠️  Kafka consumer not available – running without event consumption');
  }
};

export const disconnectConsumer = async () => {
  if (consumer) {
    try {
      await consumer.disconnect();
    } catch (err) {
      // ignore
    }
  }
};