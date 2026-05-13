require("dotenv").config();

function toEndpoint(url, defaultPath = "/") {
	try {
		const parsed = new URL(url);
		if (!parsed.pathname || parsed.pathname === "/") {
			parsed.pathname = defaultPath;
		}
		return parsed.toString().replace(/\/$/, "");
	} catch {
		const base = String(url).replace(/\/$/, "");
		return `${base}${defaultPath}`;
	}
}

const services = [
  {
    name: "user",
    url: toEndpoint(process.env.USER_SERVICE_URL || "http://user-service:4001", "/graphql"),
  },
  {
    name: "profile",
    url: toEndpoint(process.env.PROFILE_SERVICE_URL || "http://profile-service:4002"),
  },
  {
    name: "availability",
    url: toEndpoint(process.env.AVAILABILITY_SERVICE_URL || "http://availability-service:4003"),
  },
  {
    name: "matching",
    url: toEndpoint(process.env.MATCHING_SERVICE_URL || "http://matching-service:4004"),
  },
  {
    name: "session",
    url: toEndpoint(process.env.SESSION_SERVICE_URL || "http://session-service:4005"),
  },
  {
    name: "notification",
    url: toEndpoint(process.env.NOTIFICATION_SERVICE_URL || "http://notification-service:4006"),
  },
  {
    name: "messaging",
    url: toEndpoint(process.env.MESSAGING_SERVICE_URL || "http://messaging-service:4007/graphql", "/graphql"),
  },
];

module.exports = { services };
