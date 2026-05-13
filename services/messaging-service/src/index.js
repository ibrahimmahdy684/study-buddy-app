import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { parse as parseCookie } from "cookie";
import jwt from "jsonwebtoken";

import typeDefs from "./schema.js";
import resolvers from "./resolvers.js";
import prisma from "./db.js";
import { createKafkaPublisher } from "./kafka.js";

const PORT = parseInt(process.env.PORT || "4007", 10);

/* -------------------------------------------------------------------------- */
/*  Auth helpers                                                              */
/* -------------------------------------------------------------------------- */

const authUserFromToken = (token) => {
	if (!token || !process.env.JWT_SECRET) return null;
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		if (decoded?.id) return { id: String(decoded.id) };
	} catch {
		return null;
	}
	return null;
};

const parseAuthUser = (req) => {
	let token = null;

	const cookieHeader = req?.headers?.cookie || "";
	const cookies = parseCookie(cookieHeader);
	if (cookies.token) token = cookies.token;

	const authHeader = req?.headers?.authorization || "";
	if (!token && authHeader.startsWith("Bearer ")) token = authHeader.slice(7);

	const fromToken = authUserFromToken(token);
	if (fromToken) return fromToken;

	const headerUserId =
		req?.headers?.["x-user-id"] || req?.headers?.["user-id"] || null;
	if (headerUserId) return { id: String(headerUserId) };

	return null;
};

// graphql-ws connectionParams come from the client; we accept either a Bearer
// token or an explicit userId (matching the HTTP header convention).
const parseAuthUserWs = (connectionParams = {}, request) => {
	let token = connectionParams.authToken || connectionParams.token || null;

	if (!token && typeof connectionParams.authorization === "string") {
		const value = connectionParams.authorization;
		if (value.startsWith("Bearer ")) token = value.slice(7);
	}

	// Also try cookies on the upgrade request (browsers automatically attach
	// them when ws://same-origin is used).
	if (!token && request?.headers?.cookie) {
		const cookies = parseCookie(request.headers.cookie);
		if (cookies.token) token = cookies.token;
	}

	const fromToken = authUserFromToken(token);
	if (fromToken) return fromToken;

	const headerUserId =
		connectionParams["x-user-id"] || connectionParams.userId || null;
	if (headerUserId) return { id: String(headerUserId) };

	return null;
};

/* -------------------------------------------------------------------------- */
/*  Server bootstrap                                                          */
/* -------------------------------------------------------------------------- */

const { publishMessageSent, disconnect: disconnectProducer } =
	createKafkaPublisher();

const schema = makeExecutableSchema({ typeDefs, resolvers });

const run = async () => {
	const app = express();
	const httpServer = http.createServer(app);

	// WebSocket endpoint for GraphQL subscriptions.
	const wsServer = new WebSocketServer({
		server: httpServer,
		path: "/graphql",
	});

	const serverCleanup = useServer(
		{
			schema,
			context: async (ctx) => {
				const authUser = parseAuthUserWs(ctx.connectionParams, ctx.extra?.request);
				return {
					authUser,
					userId: authUser?.id || null,
					publishMessageSent,
				};
			},
		},
		wsServer,
	);

	const apollo = new ApolloServer({
		schema,
		plugins: [
			ApolloServerPluginDrainHttpServer({ httpServer }),
			{
				async serverWillStart() {
					return {
						async drainServer() {
							await serverCleanup.dispose();
						},
					};
				},
			},
		],
	});

	await apollo.start();

	app.use(
		"/graphql",
		cors({ origin: true, credentials: true }),
		bodyParser.json({ limit: "1mb" }),
		expressMiddleware(apollo, {
			context: async ({ req }) => {
				const authUser = parseAuthUser(req);
				return {
					authUser,
					userId: authUser?.id || null,
					publishMessageSent,
				};
			},
		}),
	);

	app.get("/", (_req, res) => {
		res.status(200).json({ status: "ok", service: "messaging-service" });
	});

	app.get("/health", (_req, res) => res.json({ status: "ok" }));

	await new Promise((resolve) => httpServer.listen({ port: PORT }, resolve));
	console.log(
		`Messaging Service ready at http://localhost:${PORT}/graphql ` +
			`(subscriptions: ws://localhost:${PORT}/graphql)`,
	);
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
