const { Kafka } = require("kafkajs");
const { randomUUID } = require("crypto");

const TOPIC_USER_PREFERENCES_UPDATED = "UserPreferencesUpdated";

const brokers = (process.env.KAFKA_BROKER || "localhost:9092")
  .split(",")
  .map((s) => s.trim());

const kafka = new Kafka({
  clientId: "profile-service",
  brokers,
});

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

module.exports = {
  createKafkaPublisher,
  createUserCreatedConsumer,
  TOPIC_USER_PREFERENCES_UPDATED,
};
