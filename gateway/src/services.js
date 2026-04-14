require("dotenv").config();

const services = [
  {
    name: "user",
    url: process.env.USER_SERVICE_URL || "http://user-service:4001",
  },
  {
    name: "profile",
    url: process.env.PROFILE_SERVICE_URL || "http://profile-service:4002",
  },
  {
    name: "availability",
    url: process.env.AVAILABILITY_SERVICE_URL || "http://availability-service:4003",
  },
  {
    name: "matching",
    url: process.env.MATCHING_SERVICE_URL || "http://matching-service:4004",
  },
  {
    name: "session",
    url: process.env.SESSION_SERVICE_URL || "http://session-service:4005",
  },
  {
    name: "notification",
    url: process.env.NOTIFICATION_SERVICE_URL || "http://notification-service:4006",
  },
  {
    name: "messaging",
    url: process.env.MESSAGING_SERVICE_URL || "http://messaging-service:4007",
  },
];

module.exports = { services };
