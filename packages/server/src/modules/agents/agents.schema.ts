import { z } from "zod";

export const agentParamsSchema = z.object({
  agentId: z.string().min(1)
});

export const listAgentsQuerySchema = z.object({
  status: z.enum(["online", "offline"]).optional(),
  search: z.string().trim().min(1).optional()
});

export const latestAuditQuerySchema = z.object({
  latest: z.coerce.boolean().optional()
});
