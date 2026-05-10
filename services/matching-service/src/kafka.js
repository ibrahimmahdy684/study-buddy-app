const { Kafka } = require("kafkajs");
const { randomUUID } = require("crypto");

const TOPIC_USER_PREFERENCES_UPDATED = "UserPreferencesUpdated";
const TOPIC_AVAILABILITY_UPDATED = "AvailabilityUpdated";
const TOPIC_MATCH_IDENTIFIED = "MatchFound";
const TOPIC_MATCH_CANDIDATES_UPDATED = "MatchCandidatesUpdated";
const TOPIC_BUDDY_REQUEST_CREATED = "BuddyRequestCreated";
const TOPIC_BUDDY_REQUEST_ACCEPTED = "BuddyRequestAccepted";

const brokers = (process.env.KAFKA_BROKER || "localhost:9092")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const kafka = new Kafka({
  clientId: "matching-service",
  brokers,
});

function createKafkaPublisher() {
  if (process.env.SKIP_KAFKA === "true") {
    return {
      publishMatchIdentified: async () => randomUUID(),
      publishMatchCandidatesUpdated: async () => randomUUID(),
      publishBuddyRequestCreated: async () => randomUUID(),
      publishBuddyRequestAccepted: async () => randomUUID(),
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

  async function publishMatchIdentified(userId, candidate, correlationId) {
    const cid = correlationId || randomUUID();
    await ensureConnected();

    await producer.send({
      topic: TOPIC_MATCH_IDENTIFIED,
      messages: [
        {
          key: userId,
          value: JSON.stringify({
            event: TOPIC_MATCH_IDENTIFIED,
            timestamp: new Date().toISOString(),
            producerService: "matching-service",
            correlationId: cid,
            payload: {
              userId,
              candidate,
            },
          }),
        },
      ],
    });

    console.log(
      `[matching-service][kafka][produced] topic=${TOPIC_MATCH_IDENTIFIED} userId=${userId} candidateUserId=${candidate?.userId || "unknown"} score=${candidate?.score ?? "n/a"} correlationId=${cid}`
    );

    return cid;
  }

  async function publishMatchCandidatesUpdated(userId, candidates, minScore, correlationId) {
    const cid = correlationId || randomUUID();
    await ensureConnected();

    await producer.send({
      topic: TOPIC_MATCH_CANDIDATES_UPDATED,
      messages: [
        {
          key: userId,
          value: JSON.stringify({
            event: TOPIC_MATCH_CANDIDATES_UPDATED,
            timestamp: new Date().toISOString(),
            producerService: "matching-service",
            correlationId: cid,
            payload: {
              userId,
              minScore,
              candidates,
            },
          }),
        },
      ],
    });

    console.log(
      `[matching-service][kafka][produced] topic=${TOPIC_MATCH_CANDIDATES_UPDATED} userId=${userId} candidates=${Array.isArray(candidates) ? candidates.length : 0} minScore=${minScore} correlationId=${cid}`
    );

    return cid;
  }

  async function publishBuddyRequestCreated(payload, correlationId) {
    const cid = correlationId || randomUUID();
    await ensureConnected();

    await producer.send({
      topic: TOPIC_BUDDY_REQUEST_CREATED,
      messages: [
        {
          key: payload.requestId || payload.receiverId || payload.senderId,
          value: JSON.stringify({
            event: TOPIC_BUDDY_REQUEST_CREATED,
            timestamp: new Date().toISOString(),
            producerService: "matching-service",
            correlationId: cid,
            payload,
          }),
        },
      ],
    });

    return cid;
  }

  async function publishBuddyRequestAccepted(payload, correlationId) {
    const cid = correlationId || randomUUID();
    await ensureConnected();

    await producer.send({
      topic: TOPIC_BUDDY_REQUEST_ACCEPTED,
      messages: [
        {
          key: payload.requestId || payload.userId,
          value: JSON.stringify({
            event: TOPIC_BUDDY_REQUEST_ACCEPTED,
            timestamp: new Date().toISOString(),
            producerService: "matching-service",
            correlationId: cid,
            payload,
          }),
        },
      ],
    });

    return cid;
  }

  async function disconnect() {
    if (connected) {
      await producer.disconnect();
      connected = false;
    }
  }

  return {
    publishMatchIdentified,
    publishMatchCandidatesUpdated,
    publishBuddyRequestCreated,
    publishBuddyRequestAccepted,
    disconnect,
  };
}

function createConsumer() {
  if (process.env.SKIP_KAFKA_CONSUMER === "true") {
    return null;
  }

  return kafka.consumer({
    groupId: process.env.KAFKA_CONSUMER_GROUP || "matching-service-group",
  });
}

module.exports = {
  TOPIC_USER_PREFERENCES_UPDATED,
  TOPIC_AVAILABILITY_UPDATED,
  TOPIC_MATCH_IDENTIFIED,
  TOPIC_MATCH_CANDIDATES_UPDATED,
  TOPIC_BUDDY_REQUEST_CREATED,
  TOPIC_BUDDY_REQUEST_ACCEPTED,
  createKafkaPublisher,
  createConsumer,
};
