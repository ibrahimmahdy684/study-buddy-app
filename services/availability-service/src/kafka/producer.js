import { Kafka } from 'kafkajs';
import { randomUUID } from 'crypto';

const kafka = new Kafka({
  clientId: 'availability-service',
  brokers:  [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();
let isConnected = false;

export const connectProducer = async () => {
  if (isConnected) return;
  try {
    await producer.connect();
    isConnected = true;
    console.log('✅ Kafka producer connected');
  } catch (err) {
    console.warn('⚠️  Kafka producer not available – running without event publishing');
  }
};

export const publishEvent = async (topic, payload) => {
  if (!isConnected) {
    console.log(`📤 [SKIPPED] Would publish → [${topic}]`, JSON.stringify(payload).substring(0, 120));
    return;
  }

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
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
  }
};