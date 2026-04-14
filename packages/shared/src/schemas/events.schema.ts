import { z } from "zod";

import { EVENT_TYPES } from "../constants/event-types.js";
import { SEVERITY_LEVELS } from "../constants/severity.js";

export const securityEventSchema = z.object({
  agentId: z.string().min(1),
  eventType: z.enum(EVENT_TYPES),
  severity: z.enum(SEVERITY_LEVELS),
  source: z.string().min(1),
  message: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().datetime()
});
