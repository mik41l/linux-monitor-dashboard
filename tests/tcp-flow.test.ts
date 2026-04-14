import {
  MESSAGE_TYPES,
  type AgentHandshake,
  type MetricData,
  type SecurityEvent
} from "@monitor/shared";

import { ConnectionManager } from "../packages/server/src/receiver/connection-manager.js";
import { processIncomingFrame } from "../packages/server/src/receiver/tcp-server.js";

describe("agent to server ingest flow", () => {
  it("processes handshake, metric, and security event frames", async () => {
    const acknowledged: Array<{ messageType: number; message: string }> = [];
    const agentsService = {
      upsertHandshake: vi.fn(async (_handshake: AgentHandshake) => undefined),
      touchHeartbeat: vi.fn(async (_agentId: string) => undefined),
      markOffline: vi.fn(async (_agentId: string) => undefined)
    };
    const metricsService = {
      saveMetric: vi.fn(async (_metric: MetricData) => undefined)
    };
    const eventsService = {
      saveEvent: vi.fn(async (_event: SecurityEvent) => undefined)
    };
    const alertsService = {
      createAlertsForMetric: vi.fn(async (_metric: MetricData) => undefined),
      createAlertForSecurityEvent: vi.fn(async (_event: SecurityEvent) => undefined)
    };
    const correlationEngine = {
      processMetric: vi.fn((_metric: MetricData) => undefined),
      processEvent: vi.fn((_event: SecurityEvent) => undefined)
    };
    const websocketHub = {
      broadcast: vi.fn((_message: unknown) => undefined)
    };
    const logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
    const connections = new ConnectionManager();

    const handshakeAgentId = await processIncomingFrame({
      frame: {
        messageType: MESSAGE_TYPES.HANDSHAKE,
        payload: {
          agentId: "agent-1",
          hostname: "linux-server-1",
          ipAddress: "127.0.0.1",
          osInfo: {
            platform: "linux",
            distro: "Ubuntu",
            kernelVersion: "6.8.0",
            architecture: "x64"
          },
          version: "0.1.0"
        }
      },
      connections,
      agentsService: agentsService as never,
      metricsService: metricsService as never,
      eventsService: eventsService as never,
      alertsService: alertsService as never,
      correlationEngine: correlationEngine as never,
      websocketHub: websocketHub as never,
      logger: logger as never,
      acknowledge: (messageType, message) => {
        acknowledged.push({ messageType, message });
      }
    });

    await processIncomingFrame({
      frame: {
        messageType: MESSAGE_TYPES.METRICS,
        payload: {
          agentId: "agent-1",
          metricType: "cpu",
          value: {
            usagePercent: 91,
            loadAverage: [1.2, 1.1, 1.0],
            coreCount: 4
          },
          collectedAt: "2026-04-15T00:00:00.000Z"
        }
      },
      connections,
      agentsService: agentsService as never,
      metricsService: metricsService as never,
      eventsService: eventsService as never,
      alertsService: alertsService as never,
      correlationEngine: correlationEngine as never,
      websocketHub: websocketHub as never,
      logger: logger as never,
      acknowledge: (messageType, message) => {
        acknowledged.push({ messageType, message });
      }
    });

    await processIncomingFrame({
      frame: {
        messageType: MESSAGE_TYPES.SECURITY_EVENT,
        payload: {
          agentId: "agent-1",
          eventType: "auth.login_failed",
          severity: "warning",
          source: "auth-log",
          message: "failed login",
          details: { ipAddress: "10.0.0.8" },
          occurredAt: "2026-04-15T00:00:01.000Z"
        }
      },
      connections,
      agentsService: agentsService as never,
      metricsService: metricsService as never,
      eventsService: eventsService as never,
      alertsService: alertsService as never,
      correlationEngine: correlationEngine as never,
      websocketHub: websocketHub as never,
      logger: logger as never,
      acknowledge: (messageType, message) => {
        acknowledged.push({ messageType, message });
      }
    });

    expect(handshakeAgentId).toBe("agent-1");
    expect(agentsService.upsertHandshake).toHaveBeenCalledTimes(1);
    expect(metricsService.saveMetric).toHaveBeenCalledTimes(1);
    expect(eventsService.saveEvent).toHaveBeenCalledTimes(1);
    expect(alertsService.createAlertsForMetric).toHaveBeenCalledTimes(1);
    expect(alertsService.createAlertForSecurityEvent).toHaveBeenCalledTimes(1);
    expect(correlationEngine.processMetric).toHaveBeenCalledTimes(1);
    expect(correlationEngine.processEvent).toHaveBeenCalledTimes(1);
    expect(websocketHub.broadcast).toHaveBeenCalledTimes(2);
    expect(acknowledged).toEqual([
      { messageType: MESSAGE_TYPES.HANDSHAKE, message: "Handshake received" },
      { messageType: MESSAGE_TYPES.METRICS, message: "Metric received" },
      { messageType: MESSAGE_TYPES.SECURITY_EVENT, message: "Security event received" }
    ]);
  });
});
