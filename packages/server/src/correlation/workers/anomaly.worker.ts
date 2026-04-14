import type { MessagePort } from "node:worker_threads";
import { workerData } from "node:worker_threads";

import type { MetricData } from "@monitor/shared";

import type { CorrelationAlertCandidate } from "../types.js";

interface Payload {
  type: "metric";
  data: MetricData;
}

interface AgentState {
  cpu?: number;
  memory?: number;
  updatedAt: number;
}

const port = workerData.port as MessagePort;
const state = new Map<string, AgentState>();

port.on("message", (payload: Payload) => {
  if (payload.type !== "metric") {
    return;
  }

  const current = state.get(payload.data.agentId) ?? { updatedAt: Date.now() };

  if (payload.data.metricType === "cpu") {
    current.cpu = payload.data.value.usagePercent;
  }

  if (payload.data.metricType === "memory") {
    current.memory = payload.data.value.usagePercent;
  }

  current.updatedAt = Date.now();
  state.set(payload.data.agentId, current);

  if ((current.cpu ?? 0) > 85 && (current.memory ?? 0) > 85) {
    const candidate: CorrelationAlertCandidate = {
      ruleName: "resource-anomaly-correlation",
      severity: "warning",
      agentId: payload.data.agentId,
      message: `CPU and memory spiked together on ${payload.data.agentId}`,
      relatedEvents: ["cpu", "memory"]
    };

    port.postMessage({
      type: "alert-candidate",
      candidate
    });

    state.set(payload.data.agentId, {
      updatedAt: Date.now()
    });
  }
});

port.start();

