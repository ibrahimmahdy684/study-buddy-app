const prisma = require("./db");

const FORBIDDEN_KEYS = ["university", "academicYear", "academic_year"];

function assertNoForbiddenFields(input) {
  if (!input || typeof input !== "object") return;
  for (const k of FORBIDDEN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, k)) {
      throw new Error(
        `Field "${k}" is managed by the User service, not the Profile service`
      );
    }
  }
}

async function getProfileRecord(userId) {
  return prisma.profile.findUnique({
    where: { userId },
    include: { courses: true, helpTopics: true },
  });
}

const resolvers = {
  Query: {
    profile: async (_, { userId }) => {
      return getProfileRecord(userId);
    },
  },
  Mutation: {
    createProfile: async (_, { userId, bio }, { publishUserPreferencesUpdated }) => {
      assertNoForbiddenFields({ bio });
      const created = await prisma.profile.upsert({
        where: { userId },
        create: { userId, bio: bio ?? null },
        update: { bio: bio ?? null },
        include: { courses: true, helpTopics: true },
      });
      await publishUserPreferencesUpdated(userId, {
        reason: "profile_created",
        profileId: created.id,
      });
      return created;
    },
    updateProfile: async (_, { userId, bio }, { publishUserPreferencesUpdated }) => {
      const updated = await prisma.profile.upsert({
        where: { userId },
        create: { userId, bio: bio ?? null },
        update: { bio: bio ?? null },
        include: { courses: true, helpTopics: true },
      });
      await publishUserPreferencesUpdated(userId, {
        reason: "profile_updated",
        profileId: updated.id,
      });
      return updated;
    },
    updateStudyPreferences: async (
      _,
      { userId, input },
      { publishUserPreferencesUpdated }
    ) => {
      assertNoForbiddenFields(input);
      const data = {};
      if (input.studyPace !== undefined) data.studyPace = input.studyPace;
      if (input.studyMode !== undefined) data.studyMode = input.studyMode;
      if (input.preferredGroupSize !== undefined)
        data.preferredGroupSize = input.preferredGroupSize;
      if (input.studyStyle !== undefined) data.studyStyle = input.studyStyle;

      const updated = await prisma.profile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
        include: { courses: true, helpTopics: true },
      });
      await publishUserPreferencesUpdated(userId, {
        reason: "study_preferences_updated",
        preferences: data,
      });
      return updated;
    },
    setCourses: async (_, { userId, courses }, { publishUserPreferencesUpdated }) => {
      const profile = await prisma.profile.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      await prisma.course.deleteMany({ where: { profileId: profile.id } });
      if (courses.length > 0) {
        await prisma.course.createMany({
          data: courses.map((c) => ({
            profileId: profile.id,
            name: c.name,
            code: c.code ?? null,
          })),
        });
      }
      const updated = await getProfileRecord(userId);
      await publishUserPreferencesUpdated(userId, {
        reason: "courses_updated",
        courses: updated.courses.map((c) => ({ name: c.name, code: c.code })),
      });
      return updated;
    },
    setHelpTopics: async (_, { userId, topics }, { publishUserPreferencesUpdated }) => {
      const profile = await prisma.profile.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      await prisma.helpTopic.deleteMany({ where: { profileId: profile.id } });
      if (topics.length > 0) {
        await prisma.helpTopic.createMany({
          data: topics.map((topic) => ({
            profileId: profile.id,
            topic,
          })),
        });
      }
      const updated = await getProfileRecord(userId);
      await publishUserPreferencesUpdated(userId, {
        reason: "help_topics_updated",
        topics: updated.helpTopics.map((t) => t.topic),
      });
      return updated;
    },
  },
};

module.exports = resolvers;
