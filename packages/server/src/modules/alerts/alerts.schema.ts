import { z } from "zod";

import { SEVERITY_LEVELS } from "@monitor/shared";

export const alertsQuerySchema = z.object({
  status: z.enum(["open", "acknowledged", "resolved"]).optional(),
  severity: z.enum(SEVERITY_LEVELS).optional(),
  agentId: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(500).default(100)
});

export const alertParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const alertRuleParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const alertRuleBodySchema = z.object({
  isEnabled: z.boolean()
});
