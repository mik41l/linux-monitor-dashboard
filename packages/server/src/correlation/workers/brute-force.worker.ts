import type { MessagePort } from "node:worker_threads";
import { workerData } from "node:worker_threads";

import type { SecurityEvent } from "@monitor/shared";

import type { CorrelationAlertCandidate } from "../types.js";

interface Payload {
  type: "event";
  data: SecurityEvent;
}

const port = workerData.port as MessagePort;
const failures = new Map<string, number[]>();

port.on("message", (payload: Payload) => {
  if (payload.type !== "event" || payload.data.eventType !== "auth.login_failed") {
    return;
  }

  const key = String(payload.data.details?.ipAddress ?? payload.data.agentId);
  const now = Date.now();
  const recent = (failures.get(key) ?? []).filter((value) => now - value < 5 * 60 * 1000);

  recent.push(now);
  failures.set(key, recent);

  if (recent.length >= 5) {
    const candidate: CorrelationAlertCandidate = {
      ruleName: "brute-force-correlation",
      severity: "critical",
      agentId: payload.data.agentId,
      message: `Potential brute-force activity detected for ${key}`,
      relatedEvents: [payload.data.eventType]
    };

    port.postMessage({
      type: "alert-candidate",
      candidate
    });
    failures.set(key, []);
  }
});

port.start();

