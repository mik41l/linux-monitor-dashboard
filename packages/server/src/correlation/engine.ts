import { MessageChannel, MessagePort, Worker } from "node:worker_threads";
import type pino from "pino";

import type { MetricData, SecurityEvent } from "@monitor/shared";

import type { AlertsService } from "../modules/alerts/alerts.service.js";
import { WebSocketHub } from "../websocket/ws-hub.js";
import type { CorrelationAlertCandidate } from "./types.js";

interface CorrelationMessage {
  type: "alert-candidate";
  candidate: CorrelationAlertCandidate;
}

export class CorrelationEngine {
  private readonly bruteForceChannel = new MessageChannel();
  private readonly anomalyChannel = new MessageChannel();
  private readonly crossServerChannel = new MessageChannel();
  private readonly bruteForceWorker: Worker;
  private readonly anomalyWorker: Worker;
  private readonly crossServerWorker: Worker;

  public constructor(
    private readonly logger: pino.Logger,
    private readonly alertsService: AlertsService,
    private readonly websocketHub: WebSocketHub
  ) {
    this.bruteForceWorker = new Worker(
      new URL("./workers/brute-force.worker.js", import.meta.url),
      {
        workerData: {
          port: this.bruteForceChannel.port2
        },
        transferList: [this.bruteForceChannel.port2]
      }
    );

    this.anomalyWorker = new Worker(new URL("./workers/anomaly.worker.js", import.meta.url), {
      workerData: {
        port: this.anomalyChannel.port2
      },
      transferList: [this.anomalyChannel.port2]
    });

    this.crossServerWorker = new Worker(
      new URL("./workers/cross-server.worker.js", import.meta.url),
      {
        workerData: {
          port: this.crossServerChannel.port2
        },
        transferList: [this.crossServerChannel.port2]
      }
    );

    this.attachChannel(this.bruteForceChannel.port1);
    this.attachChannel(this.anomalyChannel.port1);
    this.attachChannel(this.crossServerChannel.port1);
  }

  public processMetric(metric: MetricData) {
    this.anomalyChannel.port1.postMessage({
      type: "metric",
      data: metric
    });
  }

  public processEvent(event: SecurityEvent) {
    this.bruteForceChannel.port1.postMessage({
      type: "event",
      data: event
    });
    this.crossServerChannel.port1.postMessage({
      type: "event",
      data: event
    });
  }

  public async stop() {
    await Promise.all([
      this.bruteForceWorker.terminate(),
      this.anomalyWorker.terminate(),
      this.crossServerWorker.terminate()
    ]);
  }

  private attachChannel(port: MessagePort) {
    port.on("message", async (message: CorrelationMessage) => {
      if (message.type !== "alert-candidate") {
        return;
      }

      const alert = await this.alertsService.createCorrelationAlert(message.candidate);

      if (!alert) {
        return;
      }

      this.websocketHub.broadcast({
        type: "alert",
        data: alert
      });
      this.logger.info({ ruleName: alert.ruleName }, "Correlation alert created");
    });

    port.start();
  }
}
