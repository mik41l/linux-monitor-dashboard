import crypto from "node:crypto";
import { MessageChannel, Worker } from "node:worker_threads";

import type { MetricData, SecurityEvent } from "@monitor/shared";
import type pino from "pino";

import type { AgentEnv } from "../config/env.js";
import { Semaphore } from "./semaphore.js";
import { SharedMetricsStore } from "./shared-metrics.js";

interface WorkerResponse {
  type: "collection-result";
  requestId: string;
  metrics?: MetricData[];
  events?: SecurityEvent[];
}

export class WorkerManager {
  private readonly sharedMetrics = SharedMetricsStore.createBuffers();
  private readonly sharedStore = new SharedMetricsStore(this.sharedMetrics);
  private readonly collectionSemaphore = new Semaphore(
    new Int32Array(
      (() => {
        const buffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
        const state = new Int32Array(buffer);
        state[0] = 1;
        return buffer;
      })()
    )
  );
  private readonly systemWorker: Worker;
  private readonly ioWorker: Worker;
  private readonly securityWorker: Worker;
  private readonly securityPort = new MessageChannel();

  public constructor(
    private readonly env: AgentEnv,
    private readonly logger: pino.Logger
  ) {
    this.systemWorker = new Worker(new URL("../workers/metric-worker.js", import.meta.url), {
      workerData: {
        agentId: env.AGENT_ID,
        group: "system",
        procPath: env.PROC_PATH,
        sharedMetrics: this.sharedMetrics
      }
    });

    this.ioWorker = new Worker(new URL("../workers/metric-worker.js", import.meta.url), {
      workerData: {
        agentId: env.AGENT_ID,
        group: "io",
        procPath: env.PROC_PATH,
        sharedMetrics: this.sharedMetrics
      }
    });

    this.securityWorker = new Worker(new URL("../workers/security-worker.js", import.meta.url), {
      workerData: {
        agentId: env.AGENT_ID,
        logPath: env.LOG_PATH,
        port: this.securityPort.port2
      },
      transferList: [this.securityPort.port2]
    });

    this.attachErrorLogging(this.systemWorker, "system-worker");
    this.attachErrorLogging(this.ioWorker, "io-worker");
    this.attachErrorLogging(this.securityWorker, "security-worker");
  }

  public async stop() {
    await Promise.all([
      this.systemWorker.terminate(),
      this.ioWorker.terminate(),
      this.securityWorker.terminate()
    ]);
  }

  public async collectMetrics() {
    if (!this.collectionSemaphore.tryAcquire()) {
      return [] as MetricData[];
    }

    try {
      const [systemMetrics, ioMetrics] = await Promise.all([
        this.requestMetrics(this.systemWorker),
        this.requestMetrics(this.ioWorker)
      ]);

      return [...systemMetrics, ...ioMetrics];
    } finally {
      this.collectionSemaphore.release();
    }
  }

  public async collectSecurityEvents() {
    return this.requestSecurityEvents();
  }

  public dumpState() {
    return {
      sharedMetrics: this.sharedStore.read(),
      workers: {
        system: this.systemWorker.threadId,
        io: this.ioWorker.threadId,
        security: this.securityWorker.threadId
      }
    };
  }

  private requestMetrics(worker: Worker) {
    const requestId = crypto.randomUUID();

    return new Promise<MetricData[]>((resolve, reject) => {
      let timer: NodeJS.Timeout | null = null;

      const handleMessage = (message: WorkerResponse) => {
        if (message.type !== "collection-result" || message.requestId !== requestId) {
          return;
        }

        if (timer) {
          clearTimeout(timer);
        }

        worker.off("message", handleMessage);
        resolve(message.metrics ?? []);
      };

      worker.on("message", handleMessage);
      worker.postMessage({
        type: "collect",
        requestId
      });

      timer = setTimeout(() => {
        worker.off("message", handleMessage);
        reject(new Error("Metric worker request timed out"));
      }, 5000);
    });
  }

  private requestSecurityEvents() {
    const requestId = crypto.randomUUID();

    return new Promise<SecurityEvent[]>((resolve, reject) => {
      let timer: NodeJS.Timeout | null = null;

      const handleMessage = (message: WorkerResponse) => {
        if (message.type !== "collection-result" || message.requestId !== requestId) {
          return;
        }

        if (timer) {
          clearTimeout(timer);
        }

        this.securityPort.port1.off("message", handleMessage);
        resolve(message.events ?? []);
      };

      this.securityPort.port1.on("message", handleMessage);
      this.securityPort.port1.postMessage({
        type: "collect",
        requestId
      });

      timer = setTimeout(() => {
        this.securityPort.port1.off("message", handleMessage);
        reject(new Error("Security worker request timed out"));
      }, 5000);
    });
  }

  private attachErrorLogging(worker: Worker, name: string) {
    worker.on("error", (error) => {
      this.logger.error({ error, worker: name }, "Worker thread failed");
    });
  }
}
