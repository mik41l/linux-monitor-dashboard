import { type SecurityEvent } from "@monitor/shared";
import type pino from "pino";

import { readEnv, type AgentEnv } from "../config/env.js";
import { WorkerManager } from "../ipc/worker-manager.js";
import { TcpClient } from "../transport/tcp-client.js";

export class AgentRuntime {
  private metricsTimer: NodeJS.Timeout | null = null;
  private securityTimer: NodeJS.Timeout | null = null;
  private readonly workerManager: WorkerManager;
  private config: AgentEnv;

  public constructor(
    env: AgentEnv,
    private readonly logger: pino.Logger,
    private readonly client: TcpClient
  ) {
    this.config = env;
    this.workerManager = new WorkerManager(env, logger);
  }

  public start() {
    this.client.start();
    void this.collectAndSendMetrics();
    void this.collectAndSendSecurityEvents();
    this.scheduleTimers();
  }

  public async stop() {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    if (this.securityTimer) {
      clearInterval(this.securityTimer);
      this.securityTimer = null;
    }

    await this.workerManager.stop();
    await this.client.stop();
  }

  public async forceCollect() {
    await Promise.all([this.collectAndSendMetrics(), this.collectAndSendSecurityEvents()]);
  }

  public dumpState() {
    return this.workerManager.dumpState();
  }

  public reloadConfig() {
    this.config = readEnv();
    this.logger.level = this.config.LOG_LEVEL;
    this.resetTimers();

    return {
      collectIntervalMs: this.config.COLLECT_INTERVAL_MS,
      securityIntervalMs: this.config.SECURITY_INTERVAL_MS,
      logLevel: this.config.LOG_LEVEL,
      configPath: this.config.AGENT_CONFIG_PATH
    };
  }

  private async collectAndSendMetrics() {
    try {
      const metrics = await this.workerManager.collectMetrics();

      for (const metric of metrics) {
        this.client.sendMetric(metric);
      }
    } catch (error) {
      this.logger.error({ error }, "Metric collection failed");
    }
  }

  private async collectAndSendSecurityEvents() {
    try {
      const events = await this.workerManager.collectSecurityEvents();

      for (const event of events) {
        this.sendSecurityEvent(event);
      }
    } catch (error) {
      this.logger.error({ error }, "Security collection failed");
    }
  }

  private sendSecurityEvent(event: SecurityEvent) {
    this.client.sendSecurityEvent(event);
  }

  private scheduleTimers() {
    this.metricsTimer = setInterval(() => {
      void this.collectAndSendMetrics();
    }, this.config.COLLECT_INTERVAL_MS);

    this.securityTimer = setInterval(() => {
      void this.collectAndSendSecurityEvents();
    }, this.config.SECURITY_INTERVAL_MS);
  }

  private resetTimers() {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    if (this.securityTimer) {
      clearInterval(this.securityTimer);
      this.securityTimer = null;
    }

    this.scheduleTimers();
  }
}
