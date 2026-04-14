import { z } from "zod";

import { EVENT_TYPES, SEVERITY_LEVELS } from "@monitor/shared";

export const eventsQuerySchema = z.object({
  severity: z.enum(SEVERITY_LEVELS).optional(),
  eventType: z.enum(EVENT_TYPES).optional(),
  agentId: z.string().min(1).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(500).default(50),
  page: z.coerce.number().int().positive().default(1)
});
