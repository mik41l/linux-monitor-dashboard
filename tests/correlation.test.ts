import { applyResourceAnomalyRule } from "../packages/server/src/correlation/rules/anomaly.rule.js";
import { applyBruteForceRule } from "../packages/server/src/correlation/rules/brute-force.rule.js";
import { applyCrossServerRule } from "../packages/server/src/correlation/rules/cross-server.rule.js";

describe("correlation rules", () => {
  it("creates a brute-force alert after five failed logins in the window", () => {
    const state = new Map<string, number[]>();
    const event = {
      agentId: "agent-1",
      eventType: "auth.login_failed",
      severity: "warning",
      source: "auth-log",
      message: "failed login",
      details: { ipAddress: "10.0.0.8" },
      occurredAt: "2026-04-15T00:00:00.000Z"
    } as const;

    for (let index = 0; index < 4; index += 1) {
      expect(applyBruteForceRule(state, event, index * 1_000)).toBeNull();
    }

    expect(applyBruteForceRule(state, event, 5_000)).toMatchObject({
      ruleName: "brute-force-correlation",
      severity: "critical",
      agentId: "agent-1"
    });
  });

  it("creates a resource anomaly only when cpu and memory spike together", () => {
    const state = new Map<string, { cpu?: number; memory?: number; updatedAt: number }>();

    expect(
      applyResourceAnomalyRule(state, {
        agentId: "agent-1",
        metricType: "cpu",
        value: { usagePercent: 95, loadAverage: [1, 1, 1], coreCount: 4 },
        collectedAt: "2026-04-15T00:00:00.000Z"
      })
    ).toBeNull();

    expect(
      applyResourceAnomalyRule(state, {
        agentId: "agent-1",
        metricType: "memory",
        value: { totalBytes: 10, usedBytes: 9, freeBytes: 1, usagePercent: 92 },
        collectedAt: "2026-04-15T00:00:01.000Z"
      })
    ).toMatchObject({
      ruleName: "resource-anomaly-correlation",
      severity: "warning"
    });
  });

  it("creates cross-server alerts for matching events and privilege escalation", () => {
    const state = new Map<string, Array<{ agentId: string; occurredAt: number }>>();

    expect(
      applyCrossServerRule(state, {
        agentId: "agent-1",
        eventType: "system.service_failed",
        severity: "warning",
        source: "syslog",
        message: "failed",
        occurredAt: "2026-04-15T00:00:00.000Z"
      })
    ).toBeNull();

    expect(
      applyCrossServerRule(
        state,
        {
          agentId: "agent-2",
          eventType: "system.service_failed",
          severity: "warning",
          source: "syslog",
          message: "failed",
          occurredAt: "2026-04-15T00:00:01.000Z"
        },
        1_000
      )
    ).toMatchObject({
      ruleName: "cross-server-correlation",
      severity: "warning"
    });

    expect(
      applyCrossServerRule(state, {
        agentId: "agent-2",
        eventType: "auth.privilege_escalation",
        severity: "critical",
        source: "auth-log",
        message: "sudo",
        occurredAt: "2026-04-15T00:00:02.000Z"
      })
    ).toMatchObject({
      ruleName: "privilege-escalation-correlation",
      severity: "critical"
    });
  });
});
