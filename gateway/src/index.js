require("dotenv").config();

const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { stitchSchemas } = require("@graphql-tools/stitch");
const { schemaFromExecutor, wrapSchema, RenameRootFields } = require("@graphql-tools/wrap");
const { buildHTTPExecutor } = require("@graphql-tools/executor-http");

const { extractUser, extractToken } = require("./auth");
const { services } = require("./services");

function shouldPrefixRootFields() {
	return String(process.env.PREFIX_ROOT_FIELDS || "false").toLowerCase() === "true";
}

function shouldAllowPartialSchema() {
	return String(process.env.ALLOW_PARTIAL_SCHEMA || "false").toLowerCase() === "true";
}

async function makeRemoteSchema(service) {
	const executor = buildHTTPExecutor({
		endpoint: service.url,
		method: "POST",
		headers(request) {
			const user = request?.context?.user;
			const authHeader = request?.context?.authHeader;
			const cookieHeader = request?.context?.cookieHeader;

			const headers = {
				"content-type": "application/json",
				"apollo-require-preflight": "true",
				"x-apollo-operation-name": "gateway",
			};

			if (authHeader) {
				headers.authorization = authHeader;
			}

			if (cookieHeader) {
				headers.cookie = cookieHeader;
			}

			if (user?.id) {
				headers["x-user-id"] = String(user.id);
			}

			if (user?.email) {
				headers["x-user-email"] = String(user.email);
			}

			return headers;
		},
	});

	const transforms = [];
	if (shouldPrefixRootFields()) {
		transforms.push(new RenameRootFields((_, fieldName) => `${service.name}_${fieldName}`));
	}

	return wrapSchema({
		schema: await schemaFromExecutor(executor),
		executor,
		transforms,
	});
}

async function buildGatewaySchema() {
	const failedServices = [];

	const remoteSchemas = await Promise.all(
		services.map(async (service) => {
			try {
				const schema = await makeRemoteSchema(service);
				console.log(`Loaded schema from ${service.name} (${service.url})`);
				return schema;
			} catch (error) {
				console.error(`Failed to load schema from ${service.name} (${service.url}):`, error.message);
				failedServices.push(service.name);
				return null;
			}
		})
	);

	const validSchemas = remoteSchemas.filter(Boolean);
	if (!validSchemas.length) {
		throw new Error("No downstream schemas were available");
	}

	if (failedServices.length && !shouldAllowPartialSchema()) {
		throw new Error(
			`Downstream schemas unavailable: ${failedServices.join(", ")}. Set ALLOW_PARTIAL_SCHEMA=true to continue with a partial gateway schema.`
		);
	}

	return stitchSchemas({
		subschemas: validSchemas,
	});
}

async function run() {
	console.log("Loading schemas from downstream services...");
	const schema = await buildGatewaySchema();

	const server = new ApolloServer({
		schema,
		csrfPrevention: false,
		formatError: (error) => {
			console.error("Gateway GraphQL error:", error.message);
			return error;
		},
	});

	const port = Number.parseInt(process.env.PORT || "4000", 10);
	const { url } = await startStandaloneServer(server, {
		listen: { port },
		context: async ({ req }) => {
			const user = extractUser(req);
			const token = extractToken(req);

			return {
				user,
				authHeader: token ? `Bearer ${token}` : req?.headers?.authorization || null,
				cookieHeader: req?.headers?.cookie || null,
				req,
			};
		},
	});

	console.log(`Gateway ready at ${url}`);
	console.log(
		shouldPrefixRootFields()
			? "Root fields are prefixed by service name (PREFIX_ROOT_FIELDS=true)."
			: "Root fields are not prefixed (PREFIX_ROOT_FIELDS=false)."
	);
}

async function runWithRetry(retries = 20, delayMs = 5000) {
	for (let attempt = 1; attempt <= retries; attempt += 1) {
		try {
			await run();
			return;
		} catch (error) {
			console.error(`Gateway start attempt ${attempt}/${retries} failed:`, error.message);
			if (attempt < retries) {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}
	}

	throw new Error("Gateway failed to start after retries");
}

runWithRetry().catch((error) => {
	console.error("Gateway bootstrap failed:", error);
	process.exit(1);
});
