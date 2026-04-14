import type { MetricData } from "@monitor/shared";

import type { CorrelationAlertCandidate } from "../types.js";

export interface AgentState {
  cpu?: number;
  memory?: number;
  updatedAt: number;
}

export function applyResourceAnomalyRule(
  state: Map<string, AgentState>,
  metric: MetricData,
  now = Date.now()
) {
  const current = state.get(metric.agentId) ?? { updatedAt: now };

  if (metric.metricType === "cpu") {
    current.cpu = metric.value.usagePercent;
  }

  if (metric.metricType === "memory") {
    current.memory = metric.value.usagePercent;
  }

  current.updatedAt = now;
  state.set(metric.agentId, current);

  if ((current.cpu ?? 0) <= 85 || (current.memory ?? 0) <= 85) {
    return null;
  }

  state.set(metric.agentId, { updatedAt: now });

  const candidate: CorrelationAlertCandidate = {
    ruleName: "resource-anomaly-correlation",
    severity: "warning",
    agentId: metric.agentId,
    message: `CPU and memory spiked together on ${metric.agentId}`,
    relatedEvents: ["cpu", "memory"]
  };

  return candidate;
}
