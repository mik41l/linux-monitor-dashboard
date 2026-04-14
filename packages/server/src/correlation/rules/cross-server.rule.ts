import type { SecurityEvent } from "@monitor/shared";

import type { CorrelationAlertCandidate } from "../types.js";

export interface CrossServerWindowEntry {
  agentId: string;
  occurredAt: number;
}

export function applyCrossServerRule(
  eventWindow: Map<string, CrossServerWindowEntry[]>,
  event: SecurityEvent,
  now = Date.now()
) {
  if (event.eventType === "auth.privilege_escalation") {
    const candidate: CorrelationAlertCandidate = {
      ruleName: "privilege-escalation-correlation",
      severity: "critical",
      agentId: event.agentId,
      message: `Privilege escalation observed on ${event.agentId}`,
      relatedEvents: [event.eventType]
    };

    return candidate;
  }

  const recent = (eventWindow.get(event.eventType) ?? []).filter(
    (entry) => now - entry.occurredAt < 5 * 60 * 1000
  );

  recent.push({
    agentId: event.agentId,
    occurredAt: now
  });

  eventWindow.set(event.eventType, recent);
  const affectedAgents = new Set(recent.map((entry) => entry.agentId));

  if (affectedAgents.size < 2) {
    return null;
  }

  eventWindow.set(event.eventType, []);

  const candidate: CorrelationAlertCandidate = {
    ruleName: "cross-server-correlation",
    severity: "warning",
    message: `${event.eventType} detected across ${affectedAgents.size} agents`,
    relatedEvents: [event.eventType]
  };

  return candidate;
}
