import { z } from "zod";

export const agentOsInfoSchema = z.object({
  platform: z.string().min(1),
  distro: z.string().min(1).optional(),
  kernelVersion: z.string().min(1),
  architecture: z.string().min(1),
  uptimeSeconds: z.number().int().nonnegative().optional()
});

export const agentInfoSchema = z.object({
  agentId: z.string().min(1),
  hostname: z.string().min(1),
  ipAddress: z.string().ip().optional(),
  osInfo: agentOsInfoSchema.optional(),
  status: z.enum(["online", "offline"]),
  lastHeartbeat: z.string().datetime().optional(),
  registeredAt: z.string().datetime()
});

export const agentHandshakeSchema = z.object({
  agentId: z.string().min(1),
  hostname: z.string().min(1),
  ipAddress: z.string().ip().optional(),
  osInfo: agentOsInfoSchema,
  version: z.string().min(1)
});

export const agentConfigSchema = z.object({
  agentId: z.string().min(1),
  agentName: z.string().min(1),
  serverHost: z.string().min(1),
  serverPort: z.number().int().positive(),
  collectIntervalMs: z.number().int().positive(),
  securityIntervalMs: z.number().int().positive(),
  procPath: z.string().min(1),
  logPath: z.string().min(1),
  tlsEnabled: z.boolean()
});
