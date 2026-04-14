import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import tls, { type TLSSocket } from "node:tls";

import {
  MESSAGE_TYPES,
  encodeFrame,
  type AckMessage,
  type MessageType,
  type ProtocolFrame
} from "@monitor/shared";
import type pino from "pino";

import { AgentsService } from "../modules/agents/agents.service.js";
import { AlertsService } from "../modules/alerts/alerts.service.js";
import { EventsService } from "../modules/events/events.service.js";
import { MetricsService } from "../modules/metrics/metrics.service.js";
import { CorrelationEngine } from "../correlation/engine.js";
import { WebSocketHub } from "../websocket/ws-hub.js";
import { ConnectionManager } from "./connection-manager.js";
import {
  isHandshakeFrame,
  isHeartbeatFrame,
  isFirewallAuditFrame,
  isHardeningReportFrame,
  isLoginActivityFrame,
  isMetricFrame,
  isPortScanFrame,
  isSshdAuditFrame,
  isSecurityEventFrame,
  parseFrames
} from "./protocol-parser.js";

interface FrameProcessingOptions {
  frame: ProtocolFrame;
  connections: ConnectionManager;
  agentsService: AgentsService;
  metricsService: MetricsService;
  eventsService: EventsService;
  alertsService: AlertsService;
  correlationEngine: CorrelationEngine;
  websocketHub: WebSocketHub;
  logger: pino.Logger;
  acknowledge: (messageType: MessageType, message: string) => void;
}

export function createTcpServer(options: {
  host: string;
  port: number;
  tlsEnabled?: boolean;
  tlsCertPath?: string;
  tlsKeyPath?: string;
  logger: pino.Logger;
  connections: ConnectionManager;
  agentsService: AgentsService;
  metricsService: MetricsService;
  eventsService: EventsService;
  alertsService: AlertsService;
  correlationEngine: CorrelationEngine;
  websocketHub: WebSocketHub;
}) {
  const {
    agentsService,
    alertsService,
    correlationEngine,
    connections,
    eventsService,
    host,
    logger,
    metricsService,
    port,
    tlsCertPath,
    tlsEnabled,
    tlsKeyPath,
    websocketHub
  } = options;

  const server = createServer(tlsEnabled ?? false, tlsKeyPath, tlsCertPath, handleConnection);

  function handleConnection(socket: net.Socket | TLSSocket) {
    let remainder: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let activeAgentId: string | null = null;

    socket.on("data", async (chunk) => {
      const decoded = parseFrames(chunk, remainder);
      remainder = decoded.remainder;

      for (const frame of decoded.frames) {
        const nextAgentId = await processIncomingFrame({
          frame,
          connections,
          agentsService,
          metricsService,
          eventsService,
          alertsService,
          correlationEngine,
          websocketHub,
          logger,
          acknowledge: (messageType, message) => {
            writeAck(socket, messageType, message);
          }
        });

        if (nextAgentId) {
          activeAgentId = nextAgentId;
        }
      }
    });

    socket.on("close", async () => {
      if (activeAgentId) {
        connections.markOffline(activeAgentId);
        await agentsService.markOffline(activeAgentId);
        logger.warn({ agentId: activeAgentId }, "Agent disconnected");
      }
    });

    socket.on("error", (error) => {
      logger.error({ error }, "TCP socket error");
    });
  }

  return {
    server,
    start() {
      return new Promise<void>((resolve) => {
        server.listen(port, host, () => {
          logger.info({ host, port }, "TCP server listening");
          resolve();
        });
      });
    },
    stop() {
      return new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  };
}

export async function processIncomingFrame(options: FrameProcessingOptions) {
  const {
    acknowledge,
    agentsService,
    alertsService,
    connections,
    correlationEngine,
    eventsService,
    frame,
    logger,
    metricsService,
    websocketHub
  } = options;

  if (isHandshakeFrame(frame)) {
    const agent = connections.registerHandshake(frame.payload);
    await agentsService.upsertHandshake(frame.payload);
    logger.info({ agentId: agent.agentId }, "Agent handshake accepted");
    acknowledge(frame.messageType, "Handshake received");
    return agent.agentId;
  }

  if (isHeartbeatFrame(frame)) {
    const agent = connections.markHeartbeat(frame.payload.agentId);
    await agentsService.touchHeartbeat(frame.payload.agentId);
    logger.debug({ agentId: frame.payload.agentId }, "Heartbeat received");
    acknowledge(frame.messageType, agent ? "Heartbeat received" : "Unknown agent");
    return null;
  }

  if (isMetricFrame(frame)) {
    await metricsService.saveMetric(frame.payload);
    await alertsService.createAlertsForMetric(frame.payload);
    correlationEngine.processMetric(frame.payload);
    websocketHub.broadcast({
      type: "metric",
      data: frame.payload
    });
    acknowledge(frame.messageType, "Metric received");
    return null;
  }

  if (isSecurityEventFrame(frame)) {
    await eventsService.saveEvent(frame.payload);
    await alertsService.createAlertForSecurityEvent(frame.payload);
    correlationEngine.processEvent(frame.payload);
    websocketHub.broadcast({
      type: "event",
      data: frame.payload
    });
    acknowledge(frame.messageType, "Security event received");
  }

  if (isSshdAuditFrame(frame)) {
    await agentsService.saveSshdAudit(frame.payload);
    websocketHub.broadcast({
      type: "sshd-audit",
      data: frame.payload
    });
    acknowledge(frame.messageType, "SSHD audit received");
  }

  if (isPortScanFrame(frame)) {
    await agentsService.savePortScan(frame.payload);
    websocketHub.broadcast({
      type: "port-scan",
      data: frame.payload
    });
    acknowledge(frame.messageType, "Port scan received");
  }

  if (isFirewallAuditFrame(frame)) {
    await agentsService.saveFirewallAudit(frame.payload);
    websocketHub.broadcast({
      type: "firewall-audit",
      data: frame.payload
    });
    acknowledge(frame.messageType, "Firewall audit received");
  }

  if (isHardeningReportFrame(frame)) {
    await agentsService.saveHardeningReport(frame.payload);
    websocketHub.broadcast({
      type: "hardening-report",
      data: frame.payload
    });
    acknowledge(frame.messageType, "Hardening report received");
  }

  if (isLoginActivityFrame(frame)) {
    await agentsService.saveLoginActivity(frame.payload);
    websocketHub.broadcast({
      type: "login-activity",
      data: frame.payload
    });
    acknowledge(frame.messageType, "Login activity received");
  }

  return null;
}

function createServer(
  tlsEnabled: boolean,
  tlsKeyPath: string | undefined,
  tlsCertPath: string | undefined,
  handler: (socket: net.Socket | TLSSocket) => void
) {
  if (!tlsEnabled) {
    return net.createServer(handler);
  }

  if (
    !tlsKeyPath ||
    !tlsCertPath ||
    !existsSync(tlsKeyPath) ||
    !existsSync(tlsCertPath)
  ) {
    throw new Error("TLS is enabled but certificate files are missing");
  }

  return tls.createServer(
    {
      key: readFileSync(tlsKeyPath),
      cert: readFileSync(tlsCertPath)
    },
    handler
  );
}

function writeAck(socket: net.Socket | TLSSocket, receivedType: MessageType, message: string) {
  const ack: AckMessage = {
    receivedType,
    message,
    receivedAt: new Date().toISOString()
  };

  socket.write(encodeFrame(MESSAGE_TYPES.ACK, ack));
}
