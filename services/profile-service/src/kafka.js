import { randomUUID } from "crypto";
const TOPIC_USER_PREFERENCES_UPDATED = "UserPreferencesUpdated";
import { createKafkaClient } from "./createKafkaClient.js";

const brokers = (process.env.KAFKA_BROKER || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const kafka = createKafkaClient("profile-service");

function createKafkaPublisher() {
  if (process.env.SKIP_KAFKA === "true") {
    return {
      publishUserPreferencesUpdated: async () => randomUUID(),
      disconnect: async () => {},
    };
  }

  const producer = kafka.producer();
  let connected = false;

  async function ensureConnected() {
    if (!connected) {
      await producer.connect();
      connected = true;
    }
  }

  async function publishUserPreferencesUpdated(userId, payload, correlationId) {
    const cid = correlationId || randomUUID();
    await ensureConnected();
    await producer.send({
      topic: TOPIC_USER_PREFERENCES_UPDATED,
      messages: [
        {
          key: userId,
          value: JSON.stringify({
            event: TOPIC_USER_PREFERENCES_UPDATED,
            timestamp: new Date().toISOString(),
            producerService: "profile-service",
            correlationId: cid,
            payload: { userId, ...payload },
          }),
        },
      ],
    });
    console.log(
      `[profile-service][kafka][produced] topic=${TOPIC_USER_PREFERENCES_UPDATED} userId=${userId} reason=${payload?.reason || "n/a"} correlationId=${cid}`
    );
    return cid;
  }

  async function disconnect() {
    if (connected) {
      await producer.disconnect();
      connected = false;
    }
  }

  return { publishUserPreferencesUpdated, disconnect };
}

function createUserCreatedConsumer() {
  if (process.env.SKIP_KAFKA_CONSUMER === "true") {
    return null;
  }
  return kafka.consumer({ groupId: "profile-service-group" });
}

export { createKafkaPublisher, createUserCreatedConsumer, TOPIC_USER_PREFERENCES_UPDATED };
