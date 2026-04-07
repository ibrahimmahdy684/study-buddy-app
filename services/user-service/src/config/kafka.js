import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "user-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

const producer = kafka.producer();

let isConnected = false;

export const connectProducer = async () => {
  if (isConnected) return;
  try {
    await producer.connect();
    isConnected = true;
    console.log("Kafka producer connected");
  } catch (error) {
    console.error("Failed to connect Kafka producer:", error.message);
    // Non-fatal: service still works without Kafka in dev
  }
};

export const publishEvent = async (topic, eventName, payload) => {
  if (!isConnected) {
    console.warn(`Kafka not connected — skipping event: ${eventName}`);
    return;
  }
  try {
    await producer.send({
      topic,
      messages: [
        {
          key: payload.id || String(Date.now()),
          value: JSON.stringify({
            eventName,
            timestamp: new Date().toISOString(),
            producerService: "user-service",
            correlationId: `${eventName}-${Date.now()}`,
            payload,
          }),
        },
      ],
    });
    console.log(`Event published: ${eventName}`);
  } catch (error) {
    console.error(`Failed to publish event ${eventName}:`, error.message);
  }
};

export const disconnectProducer = async () => {
  if (!isConnected) return;
  await producer.disconnect();
  isConnected = false;
};

export default producer;