import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import tls, { type TLSSocket } from "node:tls";

import {
  MESSAGE_TYPES,
  encodeFrame,
  type AckMessage,
  type MessageType
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
  isMetricFrame,
  isSecurityEventFrame,
  parseFrames
} from "./protocol-parser.js";

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
        if (isHandshakeFrame(frame)) {
          const agent = connections.registerHandshake(frame.payload);
          await agentsService.upsertHandshake(frame.payload);
          activeAgentId = agent.agentId;
          logger.info({ agentId: agent.agentId }, "Agent handshake accepted");
          writeAck(socket, frame.messageType, "Handshake received");
          continue;
        }

        if (isHeartbeatFrame(frame)) {
          const agent = connections.markHeartbeat(frame.payload.agentId);
          await agentsService.touchHeartbeat(frame.payload.agentId);
          logger.debug({ agentId: frame.payload.agentId }, "Heartbeat received");
          writeAck(socket, frame.messageType, agent ? "Heartbeat received" : "Unknown agent");
          continue;
        }

        if (isMetricFrame(frame)) {
          await metricsService.saveMetric(frame.payload);
          await alertsService.createAlertsForMetric(frame.payload);
          correlationEngine.processMetric(frame.payload);
          websocketHub.broadcast({
            type: "metric",
            data: frame.payload
          });
          writeAck(socket, frame.messageType, "Metric received");
          continue;
        }

        if (isSecurityEventFrame(frame)) {
          await eventsService.saveEvent(frame.payload);
          await alertsService.createAlertForSecurityEvent(frame.payload);
          correlationEngine.processEvent(frame.payload);
          websocketHub.broadcast({
            type: "event",
            data: frame.payload
          });
          writeAck(socket, frame.messageType, "Security event received");
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
