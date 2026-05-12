import { createKafkaClient } from "./createKafkaClient.js";
import { updateUserMatchedBuddies } from "./matchState.js";

const TOPIC_MATCH_CANDIDATES_UPDATED = "MatchCandidatesUpdated";

const kafka = createKafkaClient(process.env.KAFKA_CLIENT_ID || "session-service");

export function createMatchConsumer() {
  if (process.env.SKIP_KAFKA_CONSUMER === "true") {
    return null;
  }

  return kafka.consumer({
    groupId: process.env.MATCH_KAFKA_GROUP_ID || "session-service-match-group",
  });
}

export async function startMatchConsumer(consumer) {
  if (!consumer) return;

  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC_MATCH_CANDIDATES_UPDATED, fromBeginning: false });
  console.log(`[session-service][kafka][subscribed] topic=${TOPIC_MATCH_CANDIDATES_UPDATED}`);

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const raw = message.value?.toString();
      if (!raw) return;

      try {
        const event = JSON.parse(raw);
        const payload = event?.payload || {};
        const userId = payload?.userId;
        const candidates = payload?.candidates;

        console.log(
          `[session-service][kafka][consumed] topic=${topic} userId=${userId || "unknown"} candidates=${Array.isArray(candidates) ? candidates.length : 0} correlationId=${event?.correlationId || "n/a"}`
        );

        if (!userId) return;
        updateUserMatchedBuddies(userId, candidates);
      } catch (error) {
        console.error(`[session-service][kafka][consume-error] topic=${topic} error=${error.message}`);
      }
    },
  });
}
