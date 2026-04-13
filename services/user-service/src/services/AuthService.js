import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";
import { publishEvent } from "../config/kafka.js";
import { signAuthToken } from "../utils/auth.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

const SALT_ROUNDS = 10;

const USER_EVENTS_TOPIC = process.env.KAFKA_USER_TOPIC || "user-created";

// Strip password before returning user to client
const sanitizeUser = (user) => {
  const { password, ...rest } = user;
  return rest;
};

// ─── Register ────────────────────────────────────────────────────────────────

export const registerUser = async ({ name, email, password }) => {
  // 1. Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const error = new Error("An account with this email already exists");
    error.statusCode = 409;
    throw error;
  }

  // 2. Hash password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // 3. Create user in DB
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  // 4. Publish Kafka event (non-blocking)
  await publishEvent(USER_EVENTS_TOPIC, "UserRegistered", {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  });

  // 5. Return token + sanitized user
  const token = signAuthToken(user);
  return { token, user: sanitizeUser(user) };
};

// ─── Login ───────────────────────────────────────────────────────────────────

export const loginUser = async ({ email, password }) => {
  // 1. Find user — use same generic message for both "not found" and "wrong password"
  //    to avoid user enumeration attacks
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // 2. Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // 3. Return token + sanitized user
  const token = signAuthToken(user);

  await publishEvent(USER_EVENTS_TOPIC, "UserLoggedIn", {
    id: user.id,
    email: user.email,
    loggedInAt: new Date().toISOString(),
  });

  return { token, user: sanitizeUser(user) };
};

// ─── Get Me ──────────────────────────────────────────────────────────────────

export const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  return sanitizeUser(user);
};

// ─── Update Profile ──────────────────────────────────────────────────────────

export const updateUser = async (userId, updates) => {
  // Prevent email/password updates through this endpoint
  const { password, email, ...safeUpdates } = updates;

  const user = await prisma.user.update({
    where: { id: userId },
    data: safeUpdates,
  });

  await publishEvent(USER_EVENTS_TOPIC, "UserUpdated", {
    id: user.id,
    updatedFields: Object.keys(safeUpdates),
    updatedAt: user.updatedAt,
  });

  return sanitizeUser(user);
};

// ─── Delete Account ──────────────────────────────────────────────────────────

export const deleteUser = async (userId) => {
  await prisma.user.delete({ where: { id: userId } });

  await publishEvent(USER_EVENTS_TOPIC, "UserDeleted", { id: userId });
};