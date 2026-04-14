import type { MessagePort } from "node:worker_threads";
import { workerData } from "node:worker_threads";

import type { SecurityEvent } from "@monitor/shared";

import type { CorrelationAlertCandidate } from "../types.js";

interface Payload {
  type: "event";
  data: SecurityEvent;
}

const port = workerData.port as MessagePort;
const eventWindow = new Map<string, Array<{ agentId: string; occurredAt: number }>>();

port.on("message", (payload: Payload) => {
  if (payload.type !== "event") {
    return;
  }

  if (payload.data.eventType === "auth.privilege_escalation") {
    const candidate: CorrelationAlertCandidate = {
      ruleName: "privilege-escalation-correlation",
      severity: "critical",
      agentId: payload.data.agentId,
      message: `Privilege escalation observed on ${payload.data.agentId}`,
      relatedEvents: [payload.data.eventType]
    };

    port.postMessage({
      type: "alert-candidate",
      candidate
    });
    return;
  }

  const now = Date.now();
  const recent = (eventWindow.get(payload.data.eventType) ?? []).filter(
    (entry) => now - entry.occurredAt < 5 * 60 * 1000
  );

  recent.push({
    agentId: payload.data.agentId,
    occurredAt: now
  });

  eventWindow.set(payload.data.eventType, recent);
  const affectedAgents = new Set(recent.map((entry) => entry.agentId));

  if (affectedAgents.size >= 2) {
    const candidate: CorrelationAlertCandidate = {
      ruleName: "cross-server-correlation",
      severity: "warning",
      message: `${payload.data.eventType} detected across ${affectedAgents.size} agents`,
      relatedEvents: [payload.data.eventType]
    };

    port.postMessage({
      type: "alert-candidate",
      candidate
    });

    eventWindow.set(payload.data.eventType, []);
  }
});

port.start();
