import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import prisma from "./db.js";
import { pubsub, TOPIC_MESSAGE_SENT } from "./pubsub.js";

const requireUserId = (context) => {
	const userId = context?.authUser?.id || context?.userId || null;
	if (!userId) {
		throw new GraphQLError("Not authenticated", {
			extensions: { code: "UNAUTHENTICATED" },
		});
	}
	return String(userId);
};

const canonicalPair = (userA, userB) =>
	String(userA) <= String(userB)
		? [String(userA), String(userB)]
		: [String(userB), String(userA)];

const ensureConversation = async (userA, userB) => {
	const [participant1Id, participant2Id] = canonicalPair(userA, userB);

	return prisma.conversation.upsert({
		where: {
			participant1Id_participant2Id: {
				participant1Id,
				participant2Id,
			},
		},
		create: {
			participant1Id,
			participant2Id,
		},
		update: {},
	});
};

const resolvers = {
	Query: {
		getConversation: async (_, { otherUserId }, context) => {
			const me = requireUserId(context);
			const [participant1Id, participant2Id] = canonicalPair(me, otherUserId);

			return prisma.conversation.findUnique({
				where: {
					participant1Id_participant2Id: {
						participant1Id,
						participant2Id,
					},
				},
				include: {
					messages: {
						orderBy: { createdAt: "asc" },
					},
				},
			});
		},

		getMyConversations: async (_, __, context) => {
			const me = requireUserId(context);

			return prisma.conversation.findMany({
				where: {
					OR: [{ participant1Id: me }, { participant2Id: me }],
				},
				include: {
					messages: {
						orderBy: { createdAt: "desc" },
					},
				},
				orderBy: { updatedAt: "desc" },
			});
		},

		getMessages: async (_, { conversationId, limit = 50, offset = 0 }, context) => {
			const me = requireUserId(context);

			const conversation = await prisma.conversation.findUnique({
				where: { id: String(conversationId) },
			});

			if (!conversation) {
				throw new GraphQLError("Conversation not found", {
					extensions: { code: "NOT_FOUND" },
				});
			}

			if (conversation.participant1Id !== me && conversation.participant2Id !== me) {
				throw new GraphQLError("Forbidden", {
					extensions: { code: "FORBIDDEN" },
				});
			}

			return prisma.message.findMany({
				where: { conversationId: String(conversationId) },
				orderBy: { createdAt: "asc" },
				skip: Math.max(0, Number(offset) || 0),
				take: Math.min(100, Math.max(1, Number(limit) || 50)),
			});
		},
	},

	Mutation: {
		getOrCreateConversation: async (_, { otherUserId }, context) => {
			const senderId = requireUserId(context);
			const receiverId = String(otherUserId);

			if (senderId === receiverId) {
				throw new GraphQLError("Cannot create a conversation with yourself", {
					extensions: { code: "BAD_USER_INPUT" },
				});
			}

			return ensureConversation(senderId, receiverId);
		},

		sendMessage: async (_, { receiverId, content }, context) => {
			const senderId = requireUserId(context);
			const cleanReceiverId = String(receiverId);
			const cleanContent = String(content || "").trim();

			if (!cleanReceiverId) {
				throw new GraphQLError("receiverId is required", {
					extensions: { code: "BAD_USER_INPUT" },
				});
			}

			if (senderId === cleanReceiverId) {
				throw new GraphQLError("Cannot send a message to yourself", {
					extensions: { code: "BAD_USER_INPUT" },
				});
			}

			if (!cleanContent) {
				throw new GraphQLError("Message content cannot be empty", {
					extensions: { code: "BAD_USER_INPUT" },
				});
			}

			const conversation = await ensureConversation(senderId, cleanReceiverId);

			const message = await prisma.message.create({
				data: {
					conversationId: conversation.id,
					senderId,
					content: cleanContent,
				},
			});

			await context.publishMessageSent({
				senderId,
				receiverId: cleanReceiverId,
				conversationId: conversation.id,
				messagePreview: message.content.slice(0, 100),
			});

			// Fan-out to live GraphQL subscribers on this instance.
			await pubsub.publish(TOPIC_MESSAGE_SENT, {
				messageSent: message,
				_conversationId: conversation.id,
				_senderId: senderId,
				_receiverId: cleanReceiverId,
			});

			return message;
		},
	},

	Subscription: {
		messageSent: {
			subscribe: withFilter(
				() => pubsub.asyncIterator([TOPIC_MESSAGE_SENT]),
				(payload, args, context) => {
					if (!payload) return false;
					const me = context?.authUser?.id || context?.userId || null;
					const { _conversationId, _senderId, _receiverId } = payload;

					// Filter by explicit conversation if requested.
					if (args.conversationId) {
						return String(_conversationId) === String(args.conversationId);
					}

					// Otherwise only push events relevant to the authenticated user
					// (or recipientId, which must match the authenticated user).
					const target = args.recipientId ? String(args.recipientId) : me;
					if (!target) return false;
					return target === String(_senderId) || target === String(_receiverId);
				},
			),
		},
	},

	Message: {
		createdAt: (message) => message.createdAt.toISOString(),
	},

	Conversation: {
		messages: async (conversation) => {
			return prisma.message.findMany({
				where: { conversationId: conversation.id },
				orderBy: { createdAt: "asc" },
			});
		},
		lastMessage: async (conversation) => {
			return prisma.message.findFirst({
				where: { conversationId: conversation.id },
				orderBy: { createdAt: "desc" },
			});
		},
		createdAt: (conversation) => conversation.createdAt.toISOString(),
		updatedAt: (conversation) => conversation.updatedAt.toISOString(),
	},
};

export default resolvers;
