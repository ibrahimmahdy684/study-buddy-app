function normalizeTextList(values) {
  return [...new Set((values || []).map((v) => String(v).trim().toLowerCase()).filter(Boolean))];
}

function intersect(listA, listB) {
  const b = new Set(listB);
  return listA.filter((item) => b.has(item));
}

function jaccardScore(listA, listB) {
  if (listA.length === 0 && listB.length === 0) return 0;
  const inter = intersect(listA, listB).length;
  const union = new Set([...listA, ...listB]).size;
  return union === 0 ? 0 : inter / union;
}

function compatibleMode(modeA, modeB) {
  if (!modeA || !modeB) return false;
  if (modeA === "BOTH" || modeB === "BOTH") return true;
  return modeA === modeB;
}

function preferenceScore(a, b) {
  let score = 0;
  const reasons = [];

  if (a.studyPace && b.studyPace && a.studyPace.toLowerCase() === b.studyPace.toLowerCase()) {
    score += 5;
    reasons.push("same study pace");
  }

  if (compatibleMode(a.studyMode, b.studyMode)) {
    score += 8;
    reasons.push("compatible study mode");
  }

  if (
    Number.isInteger(a.preferredGroupSize) &&
    Number.isInteger(b.preferredGroupSize)
  ) {
    const distance = Math.abs(a.preferredGroupSize - b.preferredGroupSize);
    const partial = Math.max(0, 4 - distance);
    score += partial;
    if (partial >= 3) {
      reasons.push("similar preferred group size");
    }
  }

  if (
    a.studyStyle &&
    b.studyStyle &&
    a.studyStyle.toLowerCase() === b.studyStyle.toLowerCase()
  ) {
    score += 3;
    reasons.push("same study style");
  }

  return {
    score,
    reasons,
  };
}

function overlapForDay(slotA, slotB) {
  const start = Math.max(slotA.startMinutes, slotB.startMinutes);
  const end = Math.min(slotA.endMinutes, slotB.endMinutes);
  return Math.max(0, end - start);
}

function availabilityOverlapMinutes(slotsA, slotsB) {
  let overlap = 0;

  for (const a of slotsA || []) {
    for (const b of slotsB || []) {
      if (a.dayOfWeek !== b.dayOfWeek) continue;
      overlap += overlapForDay(a, b);
    }
  }

  return overlap;
}

function scoreMatch(source, candidate) {
  const coursesA = normalizeTextList(source.courses);
  const coursesB = normalizeTextList(candidate.courses);
  const topicsA = normalizeTextList(source.topics);
  const topicsB = normalizeTextList(candidate.topics);

  const courseOverlap = intersect(coursesA, coursesB);
  const topicOverlap = intersect(topicsA, topicsB);

  const coursesPoints = jaccardScore(coursesA, coursesB) * 35;
  const topicsPoints = jaccardScore(topicsA, topicsB) * 25;

  const overlapMinutes = availabilityOverlapMinutes(
    source.availabilities,
    candidate.availabilities
  );
  const availabilityPoints = Math.min(1, overlapMinutes / 600) * 20;

  const prefs = preferenceScore(source, candidate);
  const rawScore = coursesPoints + topicsPoints + availabilityPoints + prefs.score;
  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  const reasons = [];
  if (courseOverlap.length > 0) reasons.push("shared courses");
  if (topicOverlap.length > 0) reasons.push("shared topics");
  if (overlapMinutes > 0) reasons.push("overlapping availability");
  reasons.push(...prefs.reasons);

  return {
    userId: candidate.userId,
    score: finalScore,
    reasons: [...new Set(reasons)],
    sharedCourses: courseOverlap,
    sharedTopics: topicOverlap,
    overlapMinutes,
  };
}

function rankCandidates(source, allProfiles, limit = 10, minScore = 0) {
  const ranked = allProfiles
    .filter((p) => p.userId !== source.userId)
    .map((candidate) => scoreMatch(source, candidate))
    .filter((result) => result.score >= minScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.userId).localeCompare(String(b.userId));
    })
    .slice(0, limit);

  return ranked;
}

module.exports = {
  rankCandidates,
};
