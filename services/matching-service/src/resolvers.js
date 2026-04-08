const prisma = require("./db");
const { rankCandidates } = require("./scoring");

function normalizeStringArray(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((v) => String(v).trim()).filter(Boolean))];
}

function normalizeSlot(slot) {
  const dayOfWeek = Number(slot.dayOfWeek);
  const startMinutes = Number(slot.startMinutes);
  const endMinutes = Number(slot.endMinutes);

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error("dayOfWeek must be an integer between 0 and 6");
  }

  if (
    !Number.isInteger(startMinutes) ||
    !Number.isInteger(endMinutes) ||
    startMinutes < 0 ||
    endMinutes > 1440 ||
    startMinutes >= endMinutes
  ) {
    throw new Error("startMinutes/endMinutes must be valid and non-overlapping");
  }

  return { dayOfWeek, startMinutes, endMinutes };
}

function assertNoOverlaps(slots) {
  const grouped = new Map();

  for (const slot of slots) {
    const key = slot.dayOfWeek;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(slot);
  }

  for (const sameDaySlots of grouped.values()) {
    sameDaySlots.sort((a, b) => a.startMinutes - b.startMinutes);
    for (let i = 1; i < sameDaySlots.length; i += 1) {
      const previous = sameDaySlots[i - 1];
      const current = sameDaySlots[i];
      if (current.startMinutes < previous.endMinutes) {
        throw new Error("Availability slots cannot overlap");
      }
    }
  }
}

async function getProfile(userId) {
  return prisma.matchProfile.findUnique({
    where: { userId },
    include: { availabilities: true },
  });
}

async function getAllProfiles() {
  return prisma.matchProfile.findMany({
    include: { availabilities: true },
  });
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
      data: slots.map((s) => ({ profileId: profile.id, ...s })),
    }),
  ]);

  return getProfile(userId);
}

async function computeRecommendedBuddies(userId, limit, minScore) {
  const source = await getProfile(userId);
  if (!source) {
    throw new Error("Match profile not found for this user");
  }

  const allProfiles = await getAllProfiles();
  return rankCandidates(source, allProfiles, limit, minScore);
}

const resolvers = {
  Query: {
    health: () => "matching-service:ok",

    matchProfile: async (_, { userId }) => {
      return getProfile(userId);
    },

    recommendedBuddies: async (_, { userId, limit, minScore }) => {
      return computeRecommendedBuddies(userId, limit, minScore);
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
      const candidates = await computeRecommendedBuddies(userId, limit, minScore);
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
