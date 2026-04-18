const prisma = require("./db");
const { rankCandidates } = require("./scoring");

// ─── Normalizers ─────────────────────────────────────────────────────────────

function normalizeStringArray(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((v) => String(v).trim()).filter(Boolean))];
}

function formatDateValue(value) {
  return new Date(value).toISOString().substring(0, 10);
}

function formatProfileRecord(profile) {
  if (!profile) return null;

  return {
    ...profile,
    createdAt: profile.createdAt ? new Date(profile.createdAt).toISOString() : null,
    updatedAt: profile.updatedAt ? new Date(profile.updatedAt).toISOString() : null,
    availabilities: Array.isArray(profile.availabilities)
      ? profile.availabilities.map((slot) => ({
          ...slot,
          date: formatDateValue(slot.date),
        }))
      : [],
  };
}

function normalizeSlot(slot) {
  const date = String(slot.date || "").trim();
  const startTime = String(slot.startTime || slot.start || "").trim();
  const endTime = String(slot.endTime || slot.end || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("date must be in YYYY-MM-DD format");
  }

  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime)) {
    throw new Error("startTime must be in HH:MM format");
  }

  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(endTime)) {
    throw new Error("endTime must be in HH:MM format");
  }

  if (startTime >= endTime) {
    throw new Error("startTime/endTime must be valid and non-overlapping");
  }

  return { date, startTime, endTime };
}

function assertNoOverlaps(slots) {
  const grouped = new Map();

  for (const slot of slots) {
    const key = slot.date;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(slot);
  }

  for (const sameDaySlots of grouped.values()) {
    sameDaySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < sameDaySlots.length; i += 1) {
      const previous = sameDaySlots[i - 1];
      const current = sameDaySlots[i];
      if (current.startTime < previous.endTime) {
        throw new Error("Availability slots cannot overlap");
      }
    }
  }
}

// ─── Data access ──────────────────────────────────────────────────────────────

async function getProfile(userId) {
  const profile = await prisma.matchProfile.findUnique({
    where: { userId },
    include: { availabilities: true },
  });

  if (profile) {
    return formatProfileRecord(profile);
  }

  try {
    const hydrated = await hydrateProfileFromUpstream(userId);
    if (!hydrated) return null;

    const reloaded = await prisma.matchProfile.findUnique({
      where: { userId },
      include: { availabilities: true },
    });

    return formatProfileRecord(reloaded);
  } catch (error) {
    console.warn(`[matching-service] unable to hydrate profile for ${userId}: ${error.message}`);
    return null;
  }
}

async function saveAvailability(userId, rawSlots) {
  const slots = rawSlots.map(normalizeSlot);
  assertNoOverlaps(slots);

  const profile = await prisma.matchProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  await prisma.$transaction([
    prisma.availabilitySlot.deleteMany({ where: { profileId: profile.id } }),
    prisma.availabilitySlot.createMany({
      data: slots.map((s) => ({
        profileId: profile.id,
        date: new Date(`${s.date}T00:00:00.000Z`),
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    }),
  ]);

  return getProfile(userId);
}

// ─── Resolvers ────────────────────────────────────────────────────────────────

const resolvers = {
  Query: {
    health: () => "matching-service:ok",

    matchProfile: async (_, { userId }) => {
      return getProfile(userId);
    },

    recommendedBuddies: async (_, { userId, limit, minScore }) => {
      const source = await getProfile(userId);
      if (!source) throw new Error("Match profile not found for this user");

      const allProfiles = await prisma.matchProfile.findMany({
        include: { availabilities: true },
      });

      return rankCandidates(source, allProfiles, limit, minScore);
    },
  },

  Mutation: {
    upsertMatchProfile: async (
      _,
      { userId, input },
      { publishTopMatchesForUser }
    ) => {
      const data = {};

      if (input.studyPace !== undefined) data.studyPace = input.studyPace;
      if (input.studyMode !== undefined) data.studyMode = input.studyMode;
      if (input.preferredGroupSize !== undefined) {
        data.preferredGroupSize = input.preferredGroupSize;
      }
      if (input.studyStyle !== undefined) data.studyStyle = input.studyStyle;
      if (input.courses !== undefined) data.courses = normalizeStringArray(input.courses);
      if (input.topics !== undefined) data.topics = normalizeStringArray(input.topics);

      const saved = await prisma.matchProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
        include: { availabilities: true },
      });

      await publishTopMatchesForUser(userId);
      return saved;
    },

    setAvailability: async (
      _,
      { userId, slots },
      { publishTopMatchesForUser }
    ) => {
      const saved = await saveAvailability(userId, slots);
      await publishTopMatchesForUser(userId);
      return saved;
    },

    recalculateMatches: async (_, { userId, limit, minScore }, { publishMatches }) => {
      const source = await getProfile(userId);
      if (!source) throw new Error("Match profile not found for this user");

      const allProfiles = await prisma.matchProfile.findMany({
        include: { availabilities: true },
      });

      const candidates = rankCandidates(source, allProfiles, limit, minScore);
      await publishMatches(userId, candidates);
      return candidates;
    },
  },
};

module.exports = {
  resolvers,
  getProfile,
  saveAvailability,
};