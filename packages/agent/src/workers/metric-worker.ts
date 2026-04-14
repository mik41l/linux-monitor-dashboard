import { parentPort, workerData } from "node:worker_threads";

import type { MetricData } from "@monitor/shared";

import { CpuCollector } from "../collectors/cpu.collector.js";
import { DiskCollector } from "../collectors/disk.collector.js";
import { MemoryCollector } from "../collectors/memory.collector.js";
import { NetworkCollector } from "../collectors/network.collector.js";
import { ProcessCollector } from "../collectors/process.collector.js";
import { SharedMetricsStore, type SharedMetricBuffers } from "../ipc/shared-metrics.js";

interface WorkerPayload {
  type: "collect";
  requestId: string;
}

interface MetricWorkerConfig {
  agentId: string;
  group: "system" | "io";
  procPath: string;
  sharedMetrics: SharedMetricBuffers;
}

const config = workerData as MetricWorkerConfig;
const sharedStore = new SharedMetricsStore(config.sharedMetrics);

const cpuCollector = new CpuCollector(config.procPath);
const memoryCollector = new MemoryCollector(config.procPath);
const diskCollector = new DiskCollector(config.procPath);
const networkCollector = new NetworkCollector(config.procPath);
const processCollector = new ProcessCollector(config.procPath);

parentPort?.on("message", async (message: WorkerPayload) => {
  if (message.type !== "collect") {
    return;
  }

  const collectedAt = new Date().toISOString();
  const metrics: MetricData[] = [];

  if (config.group === "system") {
    const cpu = await cpuCollector.collect();
    const memory = await memoryCollector.collect();

    sharedStore.write({
      cpuUsagePercent: cpu.usagePercent,
      memoryUsagePercent: memory.usagePercent
    });

    metrics.push(
      {
        agentId: config.agentId,
        metricType: "cpu",
        value: cpu,
        collectedAt
      },
      {
        agentId: config.agentId,
        metricType: "memory",
        value: memory,
        collectedAt
      }
    );
  }

  if (config.group === "io") {
    const disk = await diskCollector.collect();
    const network = await networkCollector.collect();
    const process = await processCollector.collect();
    const diskUsagePercent =
      disk.length > 0 ? Math.max(...disk.map((entry) => entry.usagePercent)) : 0;
    const networkRxBytes = network.reduce((sum, entry) => sum + entry.rxBytes, 0);
    const networkTxBytes = network.reduce((sum, entry) => sum + entry.txBytes, 0);

    sharedStore.write({
      diskUsagePercent,
      networkRxBytes,
      networkTxBytes,
      processCount: process.length
    });

    metrics.push(
      {
        agentId: config.agentId,
        metricType: "disk",
        value: disk,
        collectedAt
      },
      {
        agentId: config.agentId,
        metricType: "network",
        value: network,
        collectedAt
      },
      {
        agentId: config.agentId,
        metricType: "process",
        value: process,
        collectedAt
      }
    );
  }

  parentPort?.postMessage({
    type: "collection-result",
    requestId: message.requestId,
    metrics
  });
});
