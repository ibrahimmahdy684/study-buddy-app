import { Kafka } from "kafkajs";
import { randomUUID } from "crypto";

const TOPIC_STUDY_SESSION_CREATED = "StudySessionCreated";
const TOPIC_STUDY_SESSION_JOINED = "StudySessionJoined";
const TOPIC_STUDY_SESSION_CANCELLED = "StudySessionCancelled";

const kafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID || "session-service",
  brokers: (process.env.KAFKA_BROKER || "localhost:9092")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

const kafka = new Kafka(kafkaConfig);

function createKafkaPublisher() {
  if (process.env.SKIP_KAFKA === "true") {
    console.warn("Kafka is disabled (SKIP_KAFKA=true)");
    return {
      publishStudySessionCreated: async () => randomUUID(),
      publishStudySessionJoined: async () => randomUUID(),
      publishStudySessionCancelled: async () => randomUUID(),
      disconnect: async () => {},
    };
  }

  const producer = kafka.producer();
  let connected = false;

  async function ensureConnected() {
    if (!connected) {
      await producer.connect();
      connected = true;
      console.log("Kafka producer connected (session-service)");
    }
  }

  async function publishStudySessionCreated(userId, payload) {
    const correlationId = randomUUID();
    try {
      await ensureConnected();
      await producer.send({
        topic: TOPIC_STUDY_SESSION_CREATED,
        messages: [
          {
            key: payload.sessionId || userId,
            value: JSON.stringify({
              eventName: TOPIC_STUDY_SESSION_CREATED,
              timestamp: new Date().toISOString(),
              producerService: "session-service",
              correlationId,
              payload: {
                sessionId: payload.sessionId,
                creatorId: payload.creatorId,
                topic: payload.topic,
                date: payload.date,
                type: payload.type,
              },
            }),
          },
        ],
      });
      console.log(`✓ Published ${TOPIC_STUDY_SESSION_CREATED}:`, payload.sessionId);
      return correlationId;
    } catch (error) {
      console.error(`✗ Failed to publish ${TOPIC_STUDY_SESSION_CREATED}:`, error.message);
      throw error;
    }
  }

  async function publishStudySessionJoined(userId, payload) {
    const correlationId = randomUUID();
    try {
      await ensureConnected();
      await producer.send({
        topic: TOPIC_STUDY_SESSION_JOINED,
        messages: [
          {
            key: payload.sessionId || userId,
            value: JSON.stringify({
              eventName: TOPIC_STUDY_SESSION_JOINED,
              timestamp: new Date().toISOString(),
              producerService: "session-service",
              correlationId,
              payload: {
                sessionId: payload.sessionId,
                userId: payload.userId,
                creatorId: payload.creatorId,
              },
            }),
          },
        ],
      });
      console.log(`✓ Published ${TOPIC_STUDY_SESSION_JOINED}:`, payload.sessionId);
      return correlationId;
    } catch (error) {
      console.error(`✗ Failed to publish ${TOPIC_STUDY_SESSION_JOINED}:`, error.message);
      throw error;
    }
  }

  async function publishStudySessionCancelled(userId, payload) {
    const correlationId = randomUUID();
    try {
      await ensureConnected();
      await producer.send({
        topic: "StudySessionCancelled",
        messages: [
          {
            key: payload.sessionId || userId,
            value: JSON.stringify({
              eventName: "StudySessionCancelled",
              timestamp: new Date().toISOString(),
              producerService: "session-service",
              correlationId,
              payload: {
                sessionId: payload.sessionId,
                creatorId: payload.creatorId,
              },
            }),
          },
        ],
      });
      console.log(`✓ Published StudySessionCancelled:`, payload.sessionId);
      return correlationId;
    } catch (error) {
      console.error(`✗ Failed to publish StudySessionCancelled:`, error.message);
      throw error;
    }
  }

  async function disconnect() {
    if (connected) {
      await producer.disconnect();
      connected = false;
      console.log("Kafka producer disconnected");
    }
  }

  return {
    publishStudySessionCreated,
    publishStudySessionJoined,
    publishStudySessionCancelled,
    disconnect,
  };
}

export default{ createKafkaPublisher, TOPIC_STUDY_SESSION_CREATED, TOPIC_STUDY_SESSION_JOINED, TOPIC_STUDY_SESSION_CANCELLED };
