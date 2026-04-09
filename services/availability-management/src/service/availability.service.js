import prisma from '../db/client.js';
import { publishEvent } from '../kafka/producer.js';

// ─── Private Helpers ────────────────────────────────────────────────────────

const validateTimeRange = (startTime, endTime) => {
  if (startTime >= endTime) {
    throw new Error('start_time must be before end_time');
  }
};

const validateDayOfWeek = (day) => {
  if (day < 0 || day > 6) {
    throw new Error('dayOfWeek must be between 0 (Sunday) and 6 (Saturday)');
  }
};

const validateTimeFormat = (time) => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(time)) {
    throw new Error(`Invalid time format: "${time}". Use HH:MM (e.g. "09:00")`);
  }
};

const hasOverlap = async (userId, dayOfWeek, startTime, endTime, excludeId = null) => {
  const existing = await prisma.availabilitySlot.findMany({
    where: {
      userId,
      dayOfWeek,
      NOT: excludeId ? { id: excludeId } : undefined,
    },
  });

  return existing.some(
    (slot) => slot.startTime < endTime && slot.endTime > startTime
  );
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getByUser = async (userId) => {
  return prisma.availabilitySlot.findMany({
    where: { userId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
};

export const getById = async (id) => {
  const slot = await prisma.availabilitySlot.findUnique({ where: { id } });
  if (!slot) throw new Error(`Slot with id "${id}" not found`);
  return slot;
};

export const findOverlappingUserIds = async ({ userId, dayOfWeek, startTime, endTime }) => {
  const slots = await prisma.availabilitySlot.findMany({
    where: {
      NOT: { userId },
      dayOfWeek,
      startTime: { lte: startTime },
      endTime:   { gte: endTime },
    },
  });

  // deduplicate userIds
  return [...new Set(slots.map((s) => s.userId))];
};

export const findOverlappingDetailed = async ({ userId, dayOfWeek, startTime, endTime }) => {
  const slots = await prisma.availabilitySlot.findMany({
    where: {
      NOT: { userId },
      dayOfWeek,
      startTime: { lte: startTime },
      endTime:   { gte: endTime },
    },
  });

  // group slots by userId
  const grouped = slots.reduce((acc, slot) => {
    if (!acc[slot.userId]) acc[slot.userId] = [];
    acc[slot.userId].push(slot);
    return acc;
  }, {});

  return Object.entries(grouped).map(([uid, overlappingSlots]) => ({
    userId: uid,
    overlappingSlots,
  }));
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const addSlot = async ({ userId, dayOfWeek, startTime, endTime, isRecurring = true }) => {
  // Validate inputs
  validateDayOfWeek(dayOfWeek);
  validateTimeFormat(startTime);
  validateTimeFormat(endTime);
  validateTimeRange(startTime, endTime);

  // Check for overlaps
  if (await hasOverlap(userId, dayOfWeek, startTime, endTime)) {
    throw new Error('This slot overlaps with an existing availability window');
  }

  const slot = await prisma.availabilitySlot.create({
    data: { userId, dayOfWeek, startTime, endTime, isRecurring },
  });

  await publishEvent('availability.updated', {
    userId,
    action: 'added',
    slot,
  });

  return slot;
};

export const updateSlot = async ({ id, startTime, endTime, isRecurring }) => {
  const existing = await prisma.availabilitySlot.findUnique({ where: { id } });
  if (!existing) throw new Error(`Slot with id "${id}" not found`);

  const newStart = startTime ?? existing.startTime;
  const newEnd   = endTime   ?? existing.endTime;

  // Validate new values
  validateTimeFormat(newStart);
  validateTimeFormat(newEnd);
  validateTimeRange(newStart, newEnd);

  // Check overlaps excluding this slot
  if (await hasOverlap(existing.userId, existing.dayOfWeek, newStart, newEnd, id)) {
    throw new Error('Updated slot overlaps with an existing availability window');
  }

  const slot = await prisma.availabilitySlot.update({
    where: { id },
    data: {
      startTime:   newStart,
      endTime:     newEnd,
      isRecurring: isRecurring ?? existing.isRecurring,
    },
  });

  await publishEvent('availability.updated', {
    userId: slot.userId,
    action: 'updated',
    slot,
  });

  return slot;
};

export const deleteSlot = async (id) => {
  const slot = await prisma.availabilitySlot.findUnique({ where: { id } });
  if (!slot) throw new Error(`Slot with id "${id}" not found`);

  await prisma.availabilitySlot.delete({ where: { id } });

  await publishEvent('availability.updated', {
    userId:   slot.userId,
    action:   'deleted',
    slotId:   id,
  });

  return true;
};

export const clearAllSlots = async (userId) => {
  await prisma.availabilitySlot.deleteMany({ where: { userId } });

  await publishEvent('availability.updated', {
    userId,
    action: 'cleared',
  });

  return true;
};