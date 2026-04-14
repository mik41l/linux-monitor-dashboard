import { z } from "zod";

export const cpuMetricSchema = z.object({
  usagePercent: z.number().min(0).max(100),
  loadAverage: z.tuple([z.number(), z.number(), z.number()]),
  coreCount: z.number().int().positive()
});

export const memoryMetricSchema = z.object({
  totalBytes: z.number().nonnegative(),
  usedBytes: z.number().nonnegative(),
  freeBytes: z.number().nonnegative(),
  usagePercent: z.number().min(0).max(100),
  swapUsedBytes: z.number().nonnegative().optional()
});

export const diskMetricSchema = z.object({
  device: z.string().min(1),
  mountPoint: z.string().min(1),
  totalBytes: z.number().nonnegative(),
  usedBytes: z.number().nonnegative(),
  freeBytes: z.number().nonnegative(),
  usagePercent: z.number().min(0).max(100),
  readOps: z.number().nonnegative().optional(),
  writeOps: z.number().nonnegative().optional(),
  readBytes: z.number().nonnegative().optional(),
  writeBytes: z.number().nonnegative().optional()
});

export const networkMetricSchema = z.object({
  interfaceName: z.string().min(1),
  rxBytes: z.number().nonnegative(),
  txBytes: z.number().nonnegative(),
  rxPackets: z.number().nonnegative(),
  txPackets: z.number().nonnegative(),
  tcpConnections: z.number().nonnegative().optional(),
  udpConnections: z.number().nonnegative().optional(),
  listeningPorts: z.number().nonnegative().optional()
});

export const processMetricSchema = z.object({
  pid: z.number().int().nonnegative(),
  command: z.string().min(1),
  cpuPercent: z.number().min(0).max(100),
  memoryPercent: z.number().min(0).max(100),
  rssBytes: z.number().nonnegative().optional(),
  state: z.string().min(1).optional()
});

const baseMetricEnvelopeSchema = z.object({
  agentId: z.string().min(1),
  collectedAt: z.string().datetime()
});

export const metricDataSchema = z.discriminatedUnion("metricType", [
  baseMetricEnvelopeSchema.extend({
    metricType: z.literal("cpu"),
    value: cpuMetricSchema
  }),
  baseMetricEnvelopeSchema.extend({
    metricType: z.literal("memory"),
    value: memoryMetricSchema
  }),
  baseMetricEnvelopeSchema.extend({
    metricType: z.literal("disk"),
    value: z.array(diskMetricSchema)
  }),
  baseMetricEnvelopeSchema.extend({
    metricType: z.literal("network"),
    value: z.array(networkMetricSchema)
  }),
  baseMetricEnvelopeSchema.extend({
    metricType: z.literal("process"),
    value: z.array(processMetricSchema)
  })
]);
