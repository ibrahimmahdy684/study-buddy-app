import { createKafkaClient } from "./createKafkaClient.js";
import { randomUUID } from "crypto";

export const TOPIC_MESSAGE_SENT = "MessageSent";

const hasBrokers = !!(process.env.KAFKA_BROKER || "").trim();
const kafka = hasBrokers
	? createKafkaClient(process.env.KAFKA_CLIENT_ID || "messaging-service")
	: null;

export function createKafkaPublisher() {
	if (process.env.SKIP_KAFKA === "true" || !hasBrokers) {
		if (!hasBrokers) {
			console.warn("[messaging] KAFKA_BROKER not set — running without Kafka");
		}
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
		try {
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
		} catch (err) {
			console.error("[messaging] Kafka publish failed:", err.message);
		}

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
