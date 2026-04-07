import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .trim(),

  email: z
    .string({ required_error: "Email is required" })
    .email("Please provide a valid email address")
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be under 100 characters"),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Please provide a valid email address")
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  phone: z.string().max(20).trim().optional().nullable(),
  contactEmail: z.string().email().toLowerCase().trim().optional().nullable(),
  university: z.string().max(150).trim().optional().nullable(),
  academicYear: z.number().int().min(1).max(10).optional().nullable(),
});