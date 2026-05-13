import { createKafkaClient } from "./createKafkaClient.js";

const hasBrokers = !!(process.env.KAFKA_BROKER || "").trim();
const kafka = hasBrokers ? createKafkaClient("notification-service") : null;

function createNotificationConsumer() {
  if (process.env.SKIP_KAFKA_CONSUMER === "true" || !hasBrokers) {
    if (!hasBrokers) {
      console.warn("[notification] KAFKA_BROKER not set — running without Kafka consumer");
    }
    return null;
  }
  return kafka.consumer({ groupId: "notification-service-group" });
}

// Subscribe to multiple topics
async function subscribeToEvents(consumer, onEvent) {
  const topics = [
    "UserPreferencesUpdated",
    "BuddyRequestCreated",
    "BuddyRequestAccepted",
    "StudySessionCreated",
    "StudySessionJoined",
    "MessageSent",
    "MatchFound",
  ];

  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
    console.log(`[notification-service][kafka][subscribed] topic=${topic}`);
  }

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        await onEvent(topic, event);
      } catch (error) {
        console.error(`Error processing event from topic ${topic}:`, error);
      }
    },
  });
}

export { createNotificationConsumer, subscribeToEvents };
