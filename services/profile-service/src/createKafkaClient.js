import { Kafka } from "kafkajs";

export function createKafkaClient(clientId) {
  const brokers = (process.env.KAFKA_BROKER || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const isConfluent = process.env.KAFKA_BROKER && !process.env.KAFKA_BROKER.includes("kafka:9092");

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
