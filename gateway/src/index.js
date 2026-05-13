require("dotenv").config();

const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");
const express = require("express");
const cors = require("cors");
const http = require("http");
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
	return String(process.env.ALLOW_PARTIAL_SCHEMA || "true").toLowerCase() === "true";
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

const schemaCache = new Map();
const failedServicesTracker = new Set();

async function buildGatewaySchema() {
	const currentFailures = new Set();

	const remoteSchemas = await Promise.all(
		services.map(async (service) => {
			try {
				const schema = await makeRemoteSchema(service);
				schemaCache.set(service.name, schema);
				failedServicesTracker.delete(service.name);
				console.log(`[gateway] Loaded schema from ${service.name} (${service.url})`);
				return schema;
			} catch (error) {
				const cached = schemaCache.get(service.name);
				if (cached) {
					console.warn(`[gateway] Schema load failed for ${service.name}, using cached schema`);
					return cached;
				}
				console.error(`[gateway] Failed to load schema from ${service.name} (${service.url}):`, error.message);
				failedServicesTracker.add(service.name);
				currentFailures.add(service.name);
				return null;
			}
		})
	);

	const validSchemas = remoteSchemas.filter(Boolean);
	if (!validSchemas.length) {
		throw new Error("No downstream schemas were available");
	}

	if (currentFailures.size > 0) {
		if (!shouldAllowPartialSchema()) {
			throw new Error(`Missing schemas: ${Array.from(currentFailures).join(", ")}`);
		}
		console.warn(
			`[gateway] Starting with partial schema (missing: ${Array.from(currentFailures).join(", ")}). Services will be added as they become available.`
		);
	}

	return stitchSchemas({
		subschemas: validSchemas,
	});
}

function startSchemaRefresh(server) {
	const refreshIntervalMs = Number(process.env.SCHEMA_REFRESH_INTERVAL_MS || "30000");

	const interval = setInterval(async () => {
		if (failedServicesTracker.size === 0) return;

		console.log(`[gateway] Attempting to refresh ${failedServicesTracker.size} failed service(s)...`);

		for (const serviceName of failedServicesTracker) {
			const service = services.find((s) => s.name === serviceName);
			if (!service) continue;

			try {
				const schema = await makeRemoteSchema(service);
				schemaCache.set(serviceName, schema);
				failedServicesTracker.delete(serviceName);
				console.log(`[gateway] ✓ Recovered schema from ${serviceName}`);
				// Request schema update on the server
				if (server && typeof server.schema === "object") {
					await server.schemaDerivedData.reset()?.catch(() => {});
				}
			} catch (error) {
				console.debug(`[gateway] Refresh attempt for ${serviceName} still failing: ${error.message}`);
			}
		}
	}, refreshIntervalMs);

	return interval;
}

async function run() {
  console.log("[gateway] Loading schemas from downstream services...");
  const schema = await buildGatewaySchema();

  const setCookiePlugin = {
    async requestDidStart() {
      return {
        async willSendResponse(requestContext) {
          const { response, contextValue } = requestContext;
          if (response.body.kind === 'single' && response.body.singleResult.data) {
            const data = response.body.singleResult.data;
            let token = null;
            
            // Robust token extraction from register/login mutations
            if (data.register && data.register.token) {
              token = data.register.token;
            } else if (data.login && data.login.token) {
              token = data.login.token;
            }
            
            // Fallback: search all response keys for a token field
            if (!token) {
              for (const [key, value] of Object.entries(data)) {
                if (value && typeof value === 'object' && value.token) {
                  token = value.token;
                  break;
                }
              }
            }
            
            if (token && String(token).trim()) {
              const isProd = process.env.NODE_ENV === "production";
              const tokenValue = String(token).trim();
              const cookie = `token=${tokenValue}; HttpOnly; Path=/; Max-Age=604800; SameSite=${isProd ? "Strict" : "Lax"}${isProd ? "; Secure" : ""}`;
              contextValue.res.setHeader('Set-Cookie', cookie);
              console.log('[gateway] ✓ Set auth cookie from token');
            }
            
            if (data.logout && data.logout.success) {
              const cookie = `token=; HttpOnly; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
              contextValue.res.setHeader('Set-Cookie', cookie);
              console.log('[gateway] ✓ Cleared auth cookie on logout');
            }
          }
        }
      };
    }
  };

  const server = new ApolloServer({
    schema,
    csrfPrevention: false,
    plugins: [setCookiePlugin],
    formatError: (error) => {
      console.error("[gateway] GraphQL error:", error.message);
      return error;
    },
  });

  await server.start();

  const app = express();
  const httpServer = http.createServer(app);

	app.get("/health", (_req, res) => {
		res.status(200).send("OK");
	});

  app.use(
    "/graphql",
    cors({
      origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
      credentials: true,
    }),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        const user = extractUser(req);
        const token = extractToken(req);

        return {
          user,
          authHeader: token ? `Bearer ${token}` : req?.headers?.authorization || null,
          cookieHeader: req?.headers?.cookie || null,
          req,
          res,
        };
      },
    })
  );

  const port = Number.parseInt(process.env.PORT || "4000", 10);
  await new Promise((resolve) => httpServer.listen({ port }, resolve));

  console.log(`[gateway] Ready at http://localhost:${port}/graphql`);

  if (failedServicesTracker.size > 0) {
    startSchemaRefresh(server);
  }

  return server;
}

async function runWithRetry(retries = 10, delayMs = 5000) {
	for (let attempt = 1; attempt <= retries; attempt += 1) {
		try {
			await run();
			return;
		} catch (error) {
			console.error(`[gateway] Start attempt ${attempt}/${retries} failed:`, error.message);
			if (attempt < retries) {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}
	}

	throw new Error("[gateway] Failed to start after retries (no downstream services available)");
}

runWithRetry().catch((error) => {
	console.error("Gateway bootstrap failed:", error);
	process.exit(1);
});
