import { Kafka } from 'kafkajs';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const kafka = new Kafka({
  clientId: 'availability-service',
  brokers:  [process.env.KAFKA_BROKER],
});

const producer = kafka.producer();
let isConnected = false;

export const connectProducer = async () => {
  if (isConnected) return;
  await producer.connect();
  isConnected = true;
  console.log('✅ Kafka producer connected');
};

export const publishEvent = async (topic, payload) => {
  if (!isConnected) await connectProducer();

  const event = {
    eventName:       topic,
    timestamp:       new Date().toISOString(),
    producerService: 'availability-service',
    correlationId:   randomUUID(),
    payload,
  };

  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(event) }],
  });

  console.log(`📤 Event published → [${topic}]`, event);
};

export const disconnectProducer = async () => {
  await producer.disconnect();
  isConnected = false;
};