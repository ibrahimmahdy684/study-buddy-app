const prisma = require("./db");
const { rankCandidates } = require("./scoring");
const { getProfile, saveAvailability } = require("./resolvers");
const {
  createConsumer,
  createKafkaPublisher,
  TOPIC_USER_PREFERENCES_UPDATED,
  TOPIC_AVAILABILITY_UPDATED,
} = require("./kafka");

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function normalizeAvailabilityFromEvent(slots) {
  if (!Array.isArray(slots)) return [];
  return slots
    .map((slot) => {
      if (!slot || typeof slot !== "object") {
        return null;
      }

      const date = String(slot.date || "").trim();
      const startTime = String(slot.startTime || slot.start || "").trim();
      const endTime = String(slot.endTime || slot.end || "").trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime)) return null;
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(endTime)) return null;
      if (startTime >= endTime) return null;

      return { date, startTime, endTime };
    })
    .filter(Boolean);
}

// ─── Event handlers ─────────────────────────────────────────────────────────

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

// ─── Match publishing ────────────────────────────────────────────────────────

async function publishMatchesForUser(
  userId,
  publishMatchIdentified,
  limit,
  minScore,
  publishMatchCandidatesUpdated
) {
  const source = await getProfile(userId);
  if (!source) return [];

  const allProfiles = await prisma.matchProfile.findMany({
    include: { availabilities: true },
  });

  const candidates = rankCandidates(source, allProfiles, limit, minScore);

  for (const candidate of candidates) {
    await publishMatchIdentified(userId, candidate);
  }

  if (typeof publishMatchCandidatesUpdated === "function") {
    await publishMatchCandidatesUpdated(userId, candidates, minScore);
  }

  return candidates;
}

// ─── Consumer bootstrap ──────────────────────────────────────────────────────

async function startConsumer({ matchThreshold = 50, limit = 1000 } = {}) {
  const consumer = createConsumer();

  if (!consumer) {
    console.log("SKIP_KAFKA_CONSUMER=true — matching-service consumer disabled");
    return null;
  }

  const { publishMatchIdentified, publishMatchCandidatesUpdated } = createKafkaPublisher();

  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC_USER_PREFERENCES_UPDATED, fromBeginning: false });
  await consumer.subscribe({ topic: TOPIC_AVAILABILITY_UPDATED, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const raw = message.value?.toString();
      if (!raw) return;

      const event = JSON.parse(raw);
      const payload = event.payload || {};
      const correlationId = event.correlationId || "n/a";

      console.log(
        `[matching-service][kafka][consumed] topic=${topic} userId=${payload?.userId || "unknown"} correlationId=${correlationId}`
      );

      if (topic === TOPIC_USER_PREFERENCES_UPDATED) {
        await applyUserPreferencesEvent(payload);
        if (payload.userId) {
          await publishMatchesForUser(
            payload.userId,
            publishMatchIdentified,
            limit,
            matchThreshold,
            publishMatchCandidatesUpdated
          );
        }
      }

      if (topic === TOPIC_AVAILABILITY_UPDATED) {
        const { userId, slots } = payload;
        if (!userId) return;

        const normalized = normalizeAvailabilityFromEvent(slots);
        await saveAvailability(userId, normalized);
        await publishMatchesForUser(
          userId,
          publishMatchIdentified,
          limit,
          matchThreshold,
          publishMatchCandidatesUpdated
        );
      }
    },
  });

  return consumer;
}

module.exports = { startConsumer, publishMatchesForUser };