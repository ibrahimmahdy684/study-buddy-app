import prisma from './db.js';
import { publishEvent } from './kafka/producer.js';

const TOPIC_AVAILABILITY_UPDATED = 'AvailabilityUpdated';

// ─── Time Helpers ─────────────────────────────────────────────────────────────

// Validates and converts "HH:MM" string to a DateTime Prisma can store as @db.Time
const parseTime = (time) => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(time)) {
    throw new Error(`Invalid time format: "${time}". Use HH:MM (e.g. "09:00")`);
  }
  return new Date(`1970-01-01T${time}:00.000Z`);
};

// Converts DateTime from DB back to "HH:MM" string for GraphQL response
const formatTime = (date) => {
  return new Date(date).toISOString().substring(11, 16);
};

const parseDate = (date) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(String(date))) {
    throw new Error(`Invalid date format: "${date}". Use YYYY-MM-DD (e.g. "2026-04-18")`);
  }
  return new Date(`${date}T00:00:00.000Z`);
};

const formatDate = (date) => {
  return new Date(date).toISOString().substring(0, 10);
};

// Formats a full slot object — converts DateTime fields back to HH:MM strings
const formatSlot = (slot) => ({
  ...slot,
  date: formatDate(slot.date),
  startTime: formatTime(slot.startTime),
  endTime:   formatTime(slot.endTime),
  createdAt: slot.createdAt ? new Date(slot.createdAt).toISOString() : null,
  updatedAt: slot.updatedAt ? new Date(slot.updatedAt).toISOString() : null,
});

const publishAvailabilitySnapshot = async (userId) => {
  const slots = await prisma.availabilitySlot.findMany({
    where: { userId },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  await publishEvent(TOPIC_AVAILABILITY_UPDATED, {
    userId,
    slots: slots.map((slot) => ({
      date: formatDate(slot.date),
      startTime: formatTime(slot.startTime),
      endTime: formatTime(slot.endTime),
    })),
  });
};

// ─── Validation Helpers ───────────────────────────────────────────────────────

const validateTimeRange = (startTime, endTime) => {
  if (startTime >= endTime) {
    throw new Error('startTime must be before endTime');
  }
};

const hasOverlap = async (userId, date, startTime, endTime, excludeId = null) => {
  const parsedDate = parseDate(date);
  const existing = await prisma.availabilitySlot.findMany({
    where: {
      userId, 
      date: parsedDate,
      NOT: excludeId ? { id: excludeId } : undefined,
    },
  });

  return existing.some(
    (slot) =>
      slot.startTime < new Date(`1970-01-01T${endTime}:00.000Z`) &&
      slot.endTime   > new Date(`1970-01-01T${startTime}:00.000Z`)
  );
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getByUser = async (userId) => {
  const slots = await prisma.availabilitySlot.findMany({
    where: { userId },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
  return slots.map(formatSlot);
};

export const getById = async (id) => {
  const slot = await prisma.availabilitySlot.findUnique({ where: { id } });
  if (!slot) throw new Error(`Slot with id "${id}" not found`);
  return formatSlot(slot);
};

export const findOverlappingUserIds = async ({ userId, date, startTime, endTime }) => {
  const parsedDate = parseDate(date);
  const parsedStart = parseTime(startTime);
  const parsedEnd   = parseTime(endTime);

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      NOT:      { userId },
      date: parsedDate,
      startTime: { lte: parsedStart },
      endTime:   { gte: parsedEnd },
    },
  });

  return [...new Set(slots.map((s) => s.userId))];
};

export const findOverlappingDetailed = async ({ userId, date, startTime, endTime }) => {
  const parsedDate = parseDate(date);
  const parsedStart = parseTime(startTime);
  const parsedEnd   = parseTime(endTime);

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      NOT:      { userId },
      date: parsedDate,
      startTime: { lte: parsedStart },
      endTime:   { gte: parsedEnd },
    },
  });

  const grouped = slots.reduce((acc, slot) => {
    if (!acc[slot.userId]) acc[slot.userId] = [];
    acc[slot.userId].push(formatSlot(slot));
    return acc;
  }, {});

  return Object.entries(grouped).map(([uid, overlappingSlots]) => ({
    userId: uid,
    overlappingSlots,
  }));
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const addSlot = async ({ userId, date, startTime, endTime, isRecurring = true }) => {
  // Validate time format and range
  const parsedDate = parseDate(date);
  const parsedStart = parseTime(startTime);
  const parsedEnd   = parseTime(endTime);
  validateTimeRange(startTime, endTime);

  // Check for overlapping slots
  if (await hasOverlap(userId, date, startTime, endTime)) {
    throw new Error('This slot overlaps with an existing availability window');
  }

  const slot = await prisma.availabilitySlot.create({
    data: {
      userId,
      date: parsedDate,
      startTime:   parsedStart,
      endTime:     parsedEnd,
      isRecurring,
    },
  });

  await publishAvailabilitySnapshot(userId);

  return formatSlot(slot);
};

export const updateSlot = async ({ id, date, startTime, endTime, isRecurring }) => {
  const existing = await prisma.availabilitySlot.findUnique({ where: { id } });
  if (!existing) throw new Error(`Slot with id "${id}" not found`);

  const nextDate = date ? parseDate(date) : existing.date;
  const newStart = startTime ?? formatTime(existing.startTime);
  const newEnd   = endTime   ?? formatTime(existing.endTime);

  // Validate new time values
  const parsedStart = parseTime(newStart);
  const parsedEnd   = parseTime(newEnd);
  validateTimeRange(newStart, newEnd);

  // Check for overlaps excluding this slot
  if (await hasOverlap(existing.userId, formatDate(nextDate), newStart, newEnd, id)) {
    throw new Error('Updated slot overlaps with an existing availability window');
  }

  const slot = await prisma.availabilitySlot.update({
    where: { id },
    data: {
      date: nextDate,
      startTime:   parsedStart,
      endTime:     parsedEnd,
      isRecurring: isRecurring ?? existing.isRecurring,
    },
  });

  await publishAvailabilitySnapshot(slot.userId);

  return formatSlot(slot);
};

export const deleteSlot = async (id) => {
  const slot = await prisma.availabilitySlot.findUnique({ where: { id } });
  if (!slot) throw new Error(`Slot with id "${id}" not found`);

  await prisma.availabilitySlot.delete({ where: { id } });

  await publishAvailabilitySnapshot(slot.userId);

  return true;
};

export const clearAllSlots = async (userId) => {
  await prisma.availabilitySlot.deleteMany({ where: { userId } });

  await publishAvailabilitySnapshot(userId);

  return true;
};