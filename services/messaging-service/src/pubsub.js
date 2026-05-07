import { PubSub } from "graphql-subscriptions";

/**
 * In-memory PubSub used to fan-out new messages to subscribed clients.
 * Single-instance only — fine for development. For multi-instance
 * deployments swap for graphql-redis-subscriptions or a Kafka-backed
 * AsyncIterator (the existing Kafka publish remains for cross-service
 * fan-out to notifications etc.).
 */
export const pubsub = new PubSub();

export const TOPIC_MESSAGE_SENT = "MESSAGE_SENT";
