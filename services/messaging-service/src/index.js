import "dotenv/config";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { parse } from "cookie";
import typeDefs from "./schema.js";
import resolvers from "./resolvers.js";
import prisma from "./db.js";
import { createKafkaPublisher } from "./kafka.js";
import jwt from "jsonwebtoken";

const parseAuthUser = (req) => {
	// JWT from cookie or Authorization header
  let token = null;
  const cookieHeader = req?.headers?.cookie || "";
  const cookies = parse(cookieHeader);
  if (cookies.token) token = cookies.token;

  const authHeader = req?.headers?.authorization || "";
  if (!token && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  if (token && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.id) return { id: String(decoded.id) };
    } catch {
      return null;
    }
  }

	const headerUserId = req?.headers?.["x-user-id"] || req?.headers?.["user-id"] || null;
	if (headerUserId) {
		return { id: String(headerUserId) };
	}

  return null;
};

const server = new ApolloServer({
	typeDefs,
	resolvers,
});

const { publishMessageSent, disconnect: disconnectProducer } = createKafkaPublisher();

const run = async () => {
	const { url } = await startStandaloneServer(server, {
		listen: { port: parseInt(process.env.PORT || "4007", 10) },
		context: async ({ req }) => {
			const authUser = parseAuthUser(req);
			return {
				authUser,
				userId: authUser?.id || null,
				publishMessageSent,
			};
		},
	});

	console.log(`Messaging Service ready at ${url}`);
};

const shutdown = async () => {
	try {
		await disconnectProducer();
		await prisma.$disconnect();
	} finally {
		process.exit(0);
	}
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run().catch((error) => {
	console.error("Failed to start messaging service", error);
	process.exit(1);
});
