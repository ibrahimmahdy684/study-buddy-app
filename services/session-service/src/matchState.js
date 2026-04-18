const allowedByUser = new Map();

function normalizeUserId(userId) {
  return userId == null ? "" : String(userId);
}

export function updateUserMatchedBuddies(userId, candidates) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return;

  const buddyIds = new Set(
    Array.isArray(candidates)
      ? candidates
          .map((candidate) => normalizeUserId(candidate?.userId))
          .filter(Boolean)
      : []
  );

  allowedByUser.set(normalizedUserId, buddyIds);
}

export function canJoinCreatorSession(requestingUserId, creatorId) {
  const requester = normalizeUserId(requestingUserId);
  const creator = normalizeUserId(creatorId);

  if (!requester || !creator) return false;
  if (requester === creator) return true;

  const matched = allowedByUser.get(requester);
  if (!matched) return false;

  return matched.has(creator);
}

export function clearMatchState() {
  allowedByUser.clear();
}
