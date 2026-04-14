import { z } from "zod";

import { SEVERITY_LEVELS } from "../constants/severity.js";

export const activeSessionSchema = z.object({
  user: z.string().min(1),
  tty: z.string().min(1),
  from: z.string().min(1),
  loginAt: z.string().min(1),
  idle: z.string().min(1),
  command: z.string().min(1)
});

export const loginRecordSchema = z.object({
  user: z.string().min(1),
  tty: z.string().min(1),
  from: z.string().min(1),
  loginAt: z.string().min(1),
  status: z.enum(["success", "failure"]),
  raw: z.string().min(1)
});

export const loginActivityFindingSchema = z.object({
  key: z.string().min(1),
  severity: z.enum(SEVERITY_LEVELS),
  message: z.string().min(1),
  recommendation: z.string().min(1)
});

export const loginActivitySchema = z.object({
  agentId: z.string().min(1),
  collectedAt: z.string().datetime(),
  isAvailable: z.boolean(),
  status: z.enum(["ok", "warning", "critical", "unavailable"]),
  riskScore: z.number().int().nonnegative(),
  activeSessions: z.array(activeSessionSchema),
  successfulLogins: z.array(loginRecordSchema),
  failedLogins: z.array(loginRecordSchema),
  findings: z.array(loginActivityFindingSchema),
  error: z.string().min(1).optional()
});
