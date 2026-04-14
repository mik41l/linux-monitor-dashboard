import { Mutex } from "./mutex.js";

const METRIC_OFFSET = {
  cpuUsagePercent: 0,
  memoryUsagePercent: 1,
  diskUsagePercent: 2,
  networkRxBytes: 3,
  networkTxBytes: 4,
  processCount: 5,
  updatedAtMs: 6
} as const;

const METRIC_SLOT_COUNT = 7;

export interface SharedMetricBuffers {
  dataBuffer: SharedArrayBuffer;
  lockBuffer: SharedArrayBuffer;
}

export interface SharedMetricSummary {
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  diskUsagePercent: number;
  networkRxBytes: number;
  networkTxBytes: number;
  processCount: number;
  updatedAtMs: number;
}

export class SharedMetricsStore {
  private readonly data: Float64Array;
  private readonly mutex: Mutex;

  public constructor(buffers: SharedMetricBuffers) {
    this.data = new Float64Array(buffers.dataBuffer);
    this.mutex = new Mutex(new Int32Array(buffers.lockBuffer));
  }

  public static createBuffers(): SharedMetricBuffers {
    return {
      dataBuffer: new SharedArrayBuffer(Float64Array.BYTES_PER_ELEMENT * METRIC_SLOT_COUNT),
      lockBuffer: new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT)
    };
  }

  public write(summary: Partial<SharedMetricSummary>) {
    this.mutex.runExclusive(() => {
      if (summary.cpuUsagePercent !== undefined) {
        this.data[METRIC_OFFSET.cpuUsagePercent] = summary.cpuUsagePercent;
      }

      if (summary.memoryUsagePercent !== undefined) {
        this.data[METRIC_OFFSET.memoryUsagePercent] = summary.memoryUsagePercent;
      }

      if (summary.diskUsagePercent !== undefined) {
        this.data[METRIC_OFFSET.diskUsagePercent] = summary.diskUsagePercent;
      }

      if (summary.networkRxBytes !== undefined) {
        this.data[METRIC_OFFSET.networkRxBytes] = summary.networkRxBytes;
      }

      if (summary.networkTxBytes !== undefined) {
        this.data[METRIC_OFFSET.networkTxBytes] = summary.networkTxBytes;
      }

      if (summary.processCount !== undefined) {
        this.data[METRIC_OFFSET.processCount] = summary.processCount;
      }

      this.data[METRIC_OFFSET.updatedAtMs] = Date.now();
    });
  }

  public read(): SharedMetricSummary {
    return this.mutex.runExclusive(() => ({
      cpuUsagePercent: this.data[METRIC_OFFSET.cpuUsagePercent] ?? 0,
      memoryUsagePercent: this.data[METRIC_OFFSET.memoryUsagePercent] ?? 0,
      diskUsagePercent: this.data[METRIC_OFFSET.diskUsagePercent] ?? 0,
      networkRxBytes: this.data[METRIC_OFFSET.networkRxBytes] ?? 0,
      networkTxBytes: this.data[METRIC_OFFSET.networkTxBytes] ?? 0,
      processCount: this.data[METRIC_OFFSET.processCount] ?? 0,
      updatedAtMs: this.data[METRIC_OFFSET.updatedAtMs] ?? 0
    }));
  }
}

