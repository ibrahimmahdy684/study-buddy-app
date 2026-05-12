import { Kafka } from "kafkajs";

/**
 * Creates a Kafka client with conditional SSL/SASL configuration.
 * - Uses SSL/SASL when connecting to Confluent Cloud
 * - Uses plain connection for local docker-compose Kafka
 */
export function createKafkaClient(clientId) {
  const brokers = (process.env.KAFKA_BROKER || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const isConfluent =
    process.env.KAFKA_BROKER &&
    !process.env.KAFKA_BROKER.includes("kafka:9092");

  const kafkaConfig = {
    clientId: clientId || "unknown-service",
    brokers,
  };

  if (isConfluent) {
    kafkaConfig.ssl = true;
    kafkaConfig.sasl = {
      mechanism: "plain",
      username: process.env.KAFKA_USERNAME || "",
      password: process.env.KAFKA_PASSWORD || "",
    };
  }

  return new Kafka(kafkaConfig);
}
