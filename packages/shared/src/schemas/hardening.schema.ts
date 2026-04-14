import { z } from "zod";

export const hardeningCheckSchema = z.object({
  category: z.string().min(1),
  check: z.string().min(1),
  status: z.enum(["pass", "fail", "warning"]),
  detail: z.string().min(1),
  recommendation: z.string().min(1)
});

export const hardeningReportSchema = z.object({
  agentId: z.string().min(1),
  collectedAt: z.string().datetime(),
  isAvailable: z.boolean(),
  status: z.enum(["ok", "warning", "critical", "unavailable"]),
  overallScore: z.number().int().min(0).max(100),
  categoryScores: z.record(z.string(), z.number().int().min(0).max(100)),
  checks: z.array(hardeningCheckSchema),
  recommendations: z.array(z.string().min(1)),
  error: z.string().min(1).optional()
});
