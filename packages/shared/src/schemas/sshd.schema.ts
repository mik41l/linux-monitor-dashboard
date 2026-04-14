import { z } from "zod";

import { SEVERITY_LEVELS } from "../constants/severity.js";

export const sshdFindingSchema = z.object({
  key: z.string().min(1),
  severity: z.enum(SEVERITY_LEVELS),
  message: z.string().min(1),
  recommendation: z.string().min(1),
  observedValue: z.string().min(1).optional(),
  expectedValue: z.string().min(1).optional()
});

export const sshdAuditSchema = z.object({
  agentId: z.string().min(1),
  configPath: z.string().min(1),
  collectedAt: z.string().datetime(),
  isAvailable: z.boolean(),
  status: z.enum(["ok", "warning", "critical", "unavailable"]),
  riskScore: z.number().int().nonnegative(),
  permitRootLogin: z.string().min(1).optional(),
  passwordAuthentication: z.string().min(1).optional(),
  port: z.number().int().positive().optional(),
  maxAuthTries: z.number().int().positive().optional(),
  permitEmptyPasswords: z.string().min(1).optional(),
  x11Forwarding: z.string().min(1).optional(),
  protocol: z.string().min(1).optional(),
  usePAM: z.string().min(1).optional(),
  loginGraceTime: z.number().int().nonnegative().optional(),
  allowUsers: z.array(z.string().min(1)),
  findings: z.array(sshdFindingSchema),
  error: z.string().min(1).optional()
});
