import type { MetricName } from "../constants/metric-names.js";

export interface CpuMetric {
  usagePercent: number;
  loadAverage: [number, number, number];
  coreCount: number;
}

export interface MemoryMetric {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
  swapUsedBytes?: number;
}

export interface DiskMetric {
  device: string;
  mountPoint: string;
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
  readOps?: number;
  writeOps?: number;
  readBytes?: number;
  writeBytes?: number;
}

export interface NetworkMetric {
  interfaceName: string;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  tcpConnections?: number;
  udpConnections?: number;
  listeningPorts?: number;
}

export interface ProcessMetric {
  pid: number;
  command: string;
  cpuPercent: number;
  memoryPercent: number;
  rssBytes?: number;
  state?: string;
}

export interface MetricEnvelope<TMetricName extends MetricName, TValue> {
  agentId: string;
  metricType: TMetricName;
  value: TValue;
  collectedAt: string;
}

export type CpuMetricEnvelope = MetricEnvelope<"cpu", CpuMetric>;
export type MemoryMetricEnvelope = MetricEnvelope<"memory", MemoryMetric>;
export type DiskMetricEnvelope = MetricEnvelope<"disk", DiskMetric[]>;
export type NetworkMetricEnvelope = MetricEnvelope<"network", NetworkMetric[]>;
export type ProcessMetricEnvelope = MetricEnvelope<"process", ProcessMetric[]>;

export type MetricData =
  | CpuMetricEnvelope
  | MemoryMetricEnvelope
  | DiskMetricEnvelope
  | NetworkMetricEnvelope
  | ProcessMetricEnvelope;
