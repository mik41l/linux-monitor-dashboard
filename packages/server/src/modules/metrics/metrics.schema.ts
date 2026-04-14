import { z } from "zod";

export const metricsParamsSchema = z.object({
  agentId: z.string().min(1)
});

export const metricsQuerySchema = z.object({
  type: z.enum(["cpu", "memory", "disk", "network", "process"]).optional(),
  range: z
    .string()
    .regex(/^\d+[hm]$/)
    .optional(),
  limit: z.coerce.number().int().positive().max(500).default(120)
});
