require("dotenv").config();

const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");

const prisma = require("./db");
const { typeDefs } = require("./schema");
const { resolvers, getProfile, saveAvailability } = require("./resolvers");
const {
  createKafkaPublisher,
  createConsumer,
  TOPIC_USER_PREFERENCES_UPDATED,
  TOPIC_AVAILABILITY_UPDATED,
} = require("./kafka");
const { rankCandidates } = require("./scoring");

function mapCoursesFromEvent(courses) {
  if (!Array.isArray(courses)) return undefined;
  return courses
    .map((course) => {
      if (typeof course === "string") return course.trim();
      if (course && typeof course.name === "string") {
        const code = course.code ? String(course.code).trim() : "";
        return code ? `${course.name.trim()} (${code})` : course.name.trim();
      }
      return "";
    })
    .filter(Boolean);
}

async function applyUserPreferencesEvent(payload) {
  const { userId, reason, preferences, courses, topics } = payload;
  if (!userId) return;

  const updates = {};

  if (reason === "study_preferences_updated" && preferences) {
    if (preferences.studyPace !== undefined) updates.studyPace = preferences.studyPace;
    if (preferences.studyMode !== undefined) updates.studyMode = preferences.studyMode;
    if (preferences.preferredGroupSize !== undefined) {
      updates.preferredGroupSize = preferences.preferredGroupSize;
    }
    if (preferences.studyStyle !== undefined) updates.studyStyle = preferences.studyStyle;
  }

  if (reason === "courses_updated") {
    updates.courses = mapCoursesFromEvent(courses) || [];
  }

  if (reason === "help_topics_updated") {
    updates.topics = Array.isArray(topics)
      ? topics.map((t) => String(t).trim()).filter(Boolean)
      : [];
  }

  await prisma.matchProfile.upsert({
    where: { userId },
    create: { userId, ...updates },
    update: updates,
  });
}

function normalizeAvailabilityFromEvent(slots) {
  if (!Array.isArray(slots)) return [];

  return slots
    .map((slot) => {
      const dayOfWeek = Number(slot.dayOfWeek);
      const startMinutes = Number(
        slot.startMinutes !== undefined ? slot.startMinutes : slot.start
      );
      const endMinutes = Number(slot.endMinutes !== undefined ? slot.endMinutes : slot.end);

      if (
        !Number.isInteger(dayOfWeek) ||
        !Number.isInteger(startMinutes) ||
        !Number.isInteger(endMinutes)
      ) {
        return null;
      }

      return {
        dayOfWeek,
        startMinutes,
        endMinutes,
      };
    })
    .filter(Boolean);
}

async function publishMatchesForUser(userId, publishMatchIdentified, limit, minScore) {
  const source = await getProfile(userId);
  if (!source) return [];

  const allProfiles = await prisma.matchProfile.findMany({
    include: { availabilities: true },
  });

  const candidates = rankCandidates(source, allProfiles, limit, minScore);

  for (const candidate of candidates) {
    await publishMatchIdentified(userId, candidate);
  }

  return candidates;
}

const { publishMatchIdentified, disconnect: disconnectProducer } =
  createKafkaPublisher();

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const consumer = createConsumer();
const matchThreshold = Number(process.env.MATCH_EVENT_THRESHOLD || 55);

const run = async () => {
  if (consumer) {
    await consumer.connect();
    await consumer.subscribe({
      topic: TOPIC_USER_PREFERENCES_UPDATED,
      fromBeginning: false,
    });
    await consumer.subscribe({
      topic: TOPIC_AVAILABILITY_UPDATED,
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        const raw = message.value?.toString();
        if (!raw) return;

        const event = JSON.parse(raw);
        const payload = event.payload || {};

        if (topic === TOPIC_USER_PREFERENCES_UPDATED) {
          await applyUserPreferencesEvent(payload);
          if (payload.userId) {
            await publishMatchesForUser(
              payload.userId,
              publishMatchIdentified,
              5,
              matchThreshold
            );
          }
        }

        if (topic === TOPIC_AVAILABILITY_UPDATED) {
          const userId = payload.userId;
          if (!userId) return;

          const slots = normalizeAvailabilityFromEvent(payload.slots);
          await saveAvailability(userId, slots);
          await publishMatchesForUser(userId, publishMatchIdentified, 5, matchThreshold);
        }
      },
    });
  } else {
    console.log("SKIP_KAFKA_CONSUMER=true — matching-service consumer disabled");
  }

  const { url } = await startStandaloneServer(server, {
    listen: { port: parseInt(process.env.PORT, 10) || 4004 },
    context: async () => ({
      publishMatches: async (userId, candidates) => {
        for (const candidate of candidates) {
          await publishMatchIdentified(userId, candidate);
        }
      },
      publishTopMatchesForUser: async (userId) => {
        await publishMatchesForUser(userId, publishMatchIdentified, 5, matchThreshold);
      },
    }),
  });

  console.log(`Matching Service ready at ${url}`);
};

const shutdown = async () => {
  if (consumer) {
    await consumer.disconnect();
  }
  await disconnectProducer();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run().catch((error) => {
  console.error("matching-service failed to start", error);
  process.exit(1);
});
