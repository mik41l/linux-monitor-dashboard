import type { MessagePort } from "node:worker_threads";
import { workerData } from "node:worker_threads";

import type { MetricData } from "@monitor/shared";

import { applyResourceAnomalyRule, type AgentState } from "../rules/anomaly.rule.js";

interface Payload {
  type: "metric";
  data: MetricData;
}

const port = workerData.port as MessagePort;
const state = new Map<string, AgentState>();

port.on("message", (payload: Payload) => {
  if (payload.type !== "metric") {
    return;
  }

  const candidate = applyResourceAnomalyRule(state, payload.data);

  if (candidate) {
    port.postMessage({
      type: "alert-candidate",
      candidate
    });
  }
});

port.start();
