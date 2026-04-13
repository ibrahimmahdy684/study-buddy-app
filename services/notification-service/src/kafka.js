import { Kafka } from "kafkajs";

const brokers = (process.env.KAFKA_BROKER || "localhost:9092")
  .split(",")
  .map((s) => s.trim());

const kafka = new Kafka({
  clientId: "notification-service",
  brokers,
});

function createNotificationConsumer() {
  if (process.env.SKIP_KAFKA_CONSUMER === "true") {
    return null;
  }
  return kafka.consumer({ groupId: "notification-service-group" });
}

// Subscribe to multiple topics
async function subscribeToEvents(consumer, onEvent) {
  await consumer.subscribe({
    topics: [
      "UserPreferencesUpdated",
      "BuddyRequestCreated",
      "StudySessionCreated",
      "StudySessionJoined",
      "MatchFound",
    ],
    fromBeginning: false,
  });

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
