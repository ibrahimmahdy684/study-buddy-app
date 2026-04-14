import { Kafka } from "kafkajs";
import { randomUUID } from "crypto";

export const TOPIC_MESSAGE_SENT = "MessageSent";

const kafka = new Kafka({
	clientId: process.env.KAFKA_CLIENT_ID || "messaging-service",
	brokers: (process.env.KAFKA_BROKER || "localhost:9092")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean),
});

export function createKafkaPublisher() {
	if (process.env.SKIP_KAFKA === "true") {
		return {
			publishMessageSent: async () => randomUUID(),
			disconnect: async () => {},
		};
	}

	const producer = kafka.producer();
	let connected = false;

	const ensureConnected = async () => {
		if (!connected) {
			await producer.connect();
			connected = true;
		}
	};

	const publishMessageSent = async (messagePayload, correlationId) => {
		const cid = correlationId || randomUUID();
		await ensureConnected();

		await producer.send({
			topic: TOPIC_MESSAGE_SENT,
			messages: [
				{
					key: String(messagePayload.conversationId),
					value: JSON.stringify({
						eventName: TOPIC_MESSAGE_SENT,
						timestamp: new Date().toISOString(),
						producerService: "messaging-service",
						correlationId: cid,
						payload: messagePayload,
					}),
				},
			],
		});

		return cid;
	};

	const disconnect = async () => {
		if (connected) {
			await producer.disconnect();
			connected = false;
		}
	};

	return {
		publishMessageSent,
		disconnect,
	};
}
