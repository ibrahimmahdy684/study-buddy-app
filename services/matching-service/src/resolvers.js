import { GraphQLError } from "graphql";
import prisma from "./db.js";
import { rankCandidates } from "./scoring.js";

const matchCache = new Map();
const MATCH_CACHE_TTL_MS = 2 * 60 * 1000;

function getCachedMatches(userId) {
  const entry = matchCache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.ts > MATCH_CACHE_TTL_MS) {
    matchCache.delete(userId);
    return null;
  }
  return entry.candidates;
}

function setCachedMatches(userId, candidates) {
  matchCache.set(userId, { candidates, ts: Date.now() });
}

function invalidateMatchCache(userId) {
  matchCache.delete(userId);
}

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

const authError = () =>
  new GraphQLError("Not authenticated", {
    extensions: { code: "UNAUTHENTICATED" },
  });

function ensureAuthenticated(context) {
  if (!context?.authUser?.id) {
    throw authError();
  }
  return context.authUser.id;
}

async function checkAreBuddies(userId, buddyId) {
  if (!userId || !buddyId) return false;

  const existing = await prisma.buddyRequest.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { fromUserId: userId, toUserId: buddyId },
        { fromUserId: buddyId, toUserId: userId },
      ],
    },
  });

  return Boolean(existing);
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

      let ranked = getCachedMatches(userId);
      if (!ranked) {
        const allProfiles = await prisma.matchProfile.findMany({
          include: { availabilities: true },
        });
        ranked = rankCandidates(source, allProfiles, null, 0);
        setCachedMatches(userId, ranked);
      }

      const effectiveMin = minScore ?? 50;
      const filtered = ranked.filter((c) => c.score >= effectiveMin);
      return limit ? filtered.slice(0, limit) : filtered;
    },

    acceptedBuddyIds: async (_, __, context) => {
      const userId = ensureAuthenticated(context);
      const requests = await prisma.buddyRequest.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ fromUserId: userId }, { toUserId: userId }],
        },
      });

      return requests.map((request) =>
        request.fromUserId === userId ? request.toUserId : request.fromUserId
      );
    },

    areBuddies: async (_, { userId, buddyId }) => {
      return checkAreBuddies(userId, buddyId);
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

      invalidateMatchCache(userId);
      publishTopMatchesForUser(userId).catch(() => {});
      return saved;
    },

    setAvailability: async (
      _,
      { userId, slots },
      { publishTopMatchesForUser }
    ) => {
      const saved = await saveAvailability(userId, slots);
      invalidateMatchCache(userId);
      publishTopMatchesForUser(userId).catch(() => {});
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

export { resolvers, getProfile, saveAvailability };