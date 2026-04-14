import crypto from "node:crypto";
import { MessageChannel, Worker } from "node:worker_threads";

import type {
  FirewallAudit,
  HardeningReport,
  LoginActivityReport,
  MetricData,
  PortScanReport,
  SecurityEvent,
  SshdAuditResult
} from "@monitor/shared";
import type pino from "pino";

import type { AgentEnv } from "../config/env.js";
import { Semaphore } from "./semaphore.js";
import { SharedMetricsStore } from "./shared-metrics.js";

interface WorkerResponse {
  type: "collection-result";
  requestId: string;
  metrics?: MetricData[];
  events?: SecurityEvent[];
  sshdAudit?: SshdAuditResult;
  portScan?: PortScanReport;
  firewallAudit?: FirewallAudit;
  hardeningReport?: HardeningReport;
  loginActivity?: LoginActivityReport;
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
        sshdConfigPath: env.SSHD_CONFIG_PATH,
        ...(env.W_SNAPSHOT_PATH ? { wSnapshotPath: env.W_SNAPSHOT_PATH } : {}),
        ...(env.LAST_SNAPSHOT_PATH ? { lastSnapshotPath: env.LAST_SNAPSHOT_PATH } : {}),
        ...(env.LASTB_SNAPSHOT_PATH ? { lastbSnapshotPath: env.LASTB_SNAPSHOT_PATH } : {}),
        sshdAuditIntervalMs: env.SSHD_AUDIT_INTERVAL_MS,
        portScanIntervalMs: env.PORT_SCAN_INTERVAL_MS,
        firewallIntervalMs: env.FIREWALL_INTERVAL_MS,
        hardeningIntervalMs: env.HARDENING_INTERVAL_MS,
        loginActivityIntervalMs: env.LOGIN_ACTIVITY_INTERVAL_MS,
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

  public async collectSshdAudit() {
    return this.requestSshdAudit();
  }

  public async collectPortScan() {
    return this.requestPortScan();
  }

  public async collectFirewallAudit() {
    return this.requestFirewallAudit();
  }

  public async collectHardeningReport() {
    return this.requestHardeningReport();
  }

  public async collectLoginActivity() {
    return this.requestLoginActivity();
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
        type: "collect-events",
        requestId
      });

      timer = setTimeout(() => {
        this.securityPort.port1.off("message", handleMessage);
        reject(new Error("Security worker request timed out"));
      }, 5000);
    });
  }

  private requestSshdAudit() {
    const requestId = crypto.randomUUID();

    return new Promise<SshdAuditResult | null>((resolve, reject) => {
      let timer: NodeJS.Timeout | null = null;

      const handleMessage = (message: WorkerResponse) => {
        if (message.type !== "collection-result" || message.requestId !== requestId) {
          return;
        }

        if (timer) {
          clearTimeout(timer);
        }

        this.securityPort.port1.off("message", handleMessage);
        resolve(message.sshdAudit ?? null);
      };

      this.securityPort.port1.on("message", handleMessage);
      this.securityPort.port1.postMessage({
        type: "collect-sshd-audit",
        requestId
      });

      timer = setTimeout(() => {
        this.securityPort.port1.off("message", handleMessage);
        reject(new Error("SSHD audit request timed out"));
      }, 5000);
    });
  }

  private requestPortScan() {
    const requestId = crypto.randomUUID();

    return new Promise<{ report: PortScanReport | null; events: SecurityEvent[] }>((resolve, reject) => {
      let timer: NodeJS.Timeout | null = null;

      const handleMessage = (message: WorkerResponse) => {
        if (message.type !== "collection-result" || message.requestId !== requestId) {
          return;
        }

        if (timer) {
          clearTimeout(timer);
        }

        this.securityPort.port1.off("message", handleMessage);
        resolve({
          report: message.portScan ?? null,
          events: message.events ?? []
        });
      };

      this.securityPort.port1.on("message", handleMessage);
      this.securityPort.port1.postMessage({
        type: "collect-port-scan",
        requestId
      });

      timer = setTimeout(() => {
        this.securityPort.port1.off("message", handleMessage);
        reject(new Error("Port scan request timed out"));
      }, 5000);
    });
  }

  private requestFirewallAudit() {
    const requestId = crypto.randomUUID();

    return new Promise<{ report: FirewallAudit | null; events: SecurityEvent[] }>((resolve, reject) => {
      let timer: NodeJS.Timeout | null = null;

      const handleMessage = (message: WorkerResponse) => {
        if (message.type !== "collection-result" || message.requestId !== requestId) {
          return;
        }

        if (timer) {
          clearTimeout(timer);
        }

        this.securityPort.port1.off("message", handleMessage);
        resolve({
          report: message.firewallAudit ?? null,
          events: message.events ?? []
        });
      };

      this.securityPort.port1.on("message", handleMessage);
      this.securityPort.port1.postMessage({
        type: "collect-firewall-audit",
        requestId
      });

      timer = setTimeout(() => {
        this.securityPort.port1.off("message", handleMessage);
        reject(new Error("Firewall audit request timed out"));
      }, 5000);
    });
  }

  private requestHardeningReport() {
    const requestId = crypto.randomUUID();

    return new Promise<{ report: HardeningReport | null; events: SecurityEvent[] }>((resolve, reject) => {
      let timer: NodeJS.Timeout | null = null;

      const handleMessage = (message: WorkerResponse) => {
        if (message.type !== "collection-result" || message.requestId !== requestId) {
          return;
        }

        if (timer) {
          clearTimeout(timer);
        }

        this.securityPort.port1.off("message", handleMessage);
        resolve({
          report: message.hardeningReport ?? null,
          events: message.events ?? []
        });
      };

      this.securityPort.port1.on("message", handleMessage);
      this.securityPort.port1.postMessage({
        type: "collect-hardening-report",
        requestId
      });

      timer = setTimeout(() => {
        this.securityPort.port1.off("message", handleMessage);
        reject(new Error("Hardening report request timed out"));
      }, 5000);
    });
  }

  private requestLoginActivity() {
    const requestId = crypto.randomUUID();

    return new Promise<{ report: LoginActivityReport | null; events: SecurityEvent[] }>((resolve, reject) => {
      let timer: NodeJS.Timeout | null = null;

      const handleMessage = (message: WorkerResponse) => {
        if (message.type !== "collection-result" || message.requestId !== requestId) {
          return;
        }

        if (timer) {
          clearTimeout(timer);
        }

        this.securityPort.port1.off("message", handleMessage);
        resolve({
          report: message.loginActivity ?? null,
          events: message.events ?? []
        });
      };

      this.securityPort.port1.on("message", handleMessage);
      this.securityPort.port1.postMessage({
        type: "collect-login-activity",
        requestId
      });

      timer = setTimeout(() => {
        this.securityPort.port1.off("message", handleMessage);
        reject(new Error("Login activity request timed out"));
      }, 5000);
    });
  }

  private attachErrorLogging(worker: Worker, name: string) {
    worker.on("error", (error) => {
      this.logger.error({ error, worker: name }, "Worker thread failed");
    });
  }
}
