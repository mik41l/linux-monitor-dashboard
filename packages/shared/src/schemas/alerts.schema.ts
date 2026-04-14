import { z } from "zod";

import { SEVERITY_LEVELS } from "../constants/severity.js";

export const alertSchema = z.object({
  id: z.number().int().positive(),
  ruleName: z.string().min(1),
  severity: z.enum(SEVERITY_LEVELS),
  agentId: z.string().min(1).optional(),
  message: z.string().min(1),
  relatedEvents: z.array(z.string().min(1)),
  status: z.enum(["open", "acknowledged", "resolved"]),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional()
});

export const alertRuleSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  condition: z.record(z.string(), z.unknown()),
  severity: z.enum(SEVERITY_LEVELS),
  isEnabled: z.boolean(),
  createdAt: z.string().datetime()
});
