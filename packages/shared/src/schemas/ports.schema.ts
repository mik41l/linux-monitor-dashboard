import { z } from "zod";

export const openPortSchema = z.object({
  protocol: z.enum(["tcp", "udp"]),
  port: z.number().int().positive(),
  address: z.string().min(1),
  process: z.string().min(1),
  pid: z.number().int().positive().optional(),
  serviceName: z.string().min(1).optional(),
  isExposed: z.boolean(),
  isKnownService: z.boolean(),
  riskLevel: z.enum(["safe", "warning", "danger"])
});

export const portScanSchema = z.object({
  agentId: z.string().min(1),
  collectedAt: z.string().datetime(),
  isAvailable: z.boolean(),
  status: z.enum(["ok", "warning", "critical", "unavailable"]),
  riskScore: z.number().int().nonnegative(),
  openPorts: z.array(openPortSchema),
  findings: z.array(z.string().min(1)),
  error: z.string().min(1).optional()
});
