import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "operator", "viewer"]);
export const userStatusSchema = z.enum(["active", "disabled"]);

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const createUserBodySchema = z.object({
  email: z.string().email(),
  username: z.string().min(2),
  fullName: z.string().min(2),
  role: userRoleSchema.default("operator"),
  status: userStatusSchema.default("active"),
  password: z.string().min(8),
  mustChangePassword: z.boolean().default(false)
});

export const updateUserBodySchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(2).optional(),
  fullName: z.string().min(2).optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  mustChangePassword: z.boolean().optional()
});

export const userParamsSchema = z.object({
  userId: z.coerce.number().int().positive()
});

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

export const setPasswordBodySchema = z.object({
  password: z.string().min(8),
  mustChangePassword: z.boolean().default(false)
});

export const loginLogsQuerySchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  status: z.enum(["success", "failure"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100)
});
