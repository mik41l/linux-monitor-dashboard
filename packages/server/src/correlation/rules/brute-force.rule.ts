import type { SecurityEvent } from "@monitor/shared";

import type { CorrelationAlertCandidate } from "../types.js";

export function applyBruteForceRule(
  failures: Map<string, number[]>,
  event: SecurityEvent,
  now = Date.now()
) {
  if (event.eventType !== "auth.login_failed") {
    return null;
  }

  const key = String(event.details?.ipAddress ?? event.agentId);
  const recent = (failures.get(key) ?? []).filter((value) => now - value < 5 * 60 * 1000);

  recent.push(now);
  failures.set(key, recent);

  if (recent.length < 5) {
    return null;
  }

  failures.set(key, []);

  const candidate: CorrelationAlertCandidate = {
    ruleName: "brute-force-correlation",
    severity: "critical",
    agentId: event.agentId,
    message: `Potential brute-force activity detected for ${key}`,
    relatedEvents: [event.eventType]
  };

  return candidate;
}
