require("dotenv").config();

function toGraphQLEndpoint(url) {
	try {
		const parsed = new URL(url);
		if (!parsed.pathname || parsed.pathname === "/") {
			parsed.pathname = "/graphql";
		}
		return parsed.toString().replace(/\/$/, "");
	} catch {
		return `${String(url).replace(/\/$/, "")}/graphql`;
	}
}

const services = [
  {
    name: "user",
    url: toGraphQLEndpoint(process.env.USER_SERVICE_URL || "http://user-service:4001"),
  },
  {
    name: "profile",
    url: toGraphQLEndpoint(process.env.PROFILE_SERVICE_URL || "http://profile-service:4002"),
  },
  {
    name: "availability",
    url: toGraphQLEndpoint(process.env.AVAILABILITY_SERVICE_URL || "http://availability-service:4003"),
  },
  {
    name: "matching",
    url: toGraphQLEndpoint(process.env.MATCHING_SERVICE_URL || "http://matching-service:4004"),
  },
  {
    name: "session",
    url: toGraphQLEndpoint(process.env.SESSION_SERVICE_URL || "http://session-service:4005"),
  },
  {
    name: "notification",
    url: toGraphQLEndpoint(process.env.NOTIFICATION_SERVICE_URL || "http://notification-service:4006"),
  },
  {
    name: "messaging",
    url: toGraphQLEndpoint(process.env.MESSAGING_SERVICE_URL || "http://messaging-service:4007/graphql"),
  },
];

module.exports = { services };
