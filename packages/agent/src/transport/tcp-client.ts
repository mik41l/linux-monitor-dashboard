import os from "node:os";
import { Socket } from "node:net";
import { TLSSocket, connect as connectTls } from "node:tls";
import { existsSync, readFileSync } from "node:fs";

import {
  MESSAGE_TYPES,
  decodeFrames,
  encodeFrame,
  type AckMessage,
  type AgentHandshake,
  type FirewallAudit,
  type HeartbeatMessage,
  type HardeningReport,
  type LoginActivityReport,
  type MetricData,
  type MessageType,
  type PortScanReport,
  type SecurityEvent,
  type SshdAuditResult
} from "@monitor/shared";
import type pino from "pino";

export interface TcpClientOptions {
  agentId: string;
  agentName: string;
  collectIntervalMs: number;
  serverHost: string;
  serverPort: number;
  tlsEnabled?: boolean;
  tlsCaPath?: string;
}

export class TcpClient {
  private socket: Socket | TLSSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private remainder: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  private stopped = false;
  private isConnected = false;
  private readonly pendingFrames: Buffer[] = [];

  public constructor(
    private readonly options: TcpClientOptions,
    private readonly logger: pino.Logger
  ) {}

  public start() {
    this.connect();
  }

  public async stop() {
    this.stopped = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.socket) {
      this.socket.end();
      this.socket.destroy();
      this.socket = null;
    }

    this.isConnected = false;
  }

  public sendMetric(metric: MetricData) {
    this.send(MESSAGE_TYPES.METRICS, metric);
  }

  public sendSecurityEvent(event: SecurityEvent) {
    this.send(MESSAGE_TYPES.SECURITY_EVENT, event);
  }

  public sendSshdAudit(audit: SshdAuditResult) {
    this.send(MESSAGE_TYPES.SSHD_AUDIT, audit);
  }

  public sendPortScan(report: PortScanReport) {
    this.send(MESSAGE_TYPES.PORT_SCAN, report);
  }

  public sendFirewallAudit(report: FirewallAudit) {
    this.send(MESSAGE_TYPES.FIREWALL_AUDIT, report);
  }

  public sendHardeningReport(report: HardeningReport) {
    this.send(MESSAGE_TYPES.HARDENING_REPORT, report);
  }

  public sendLoginActivity(report: LoginActivityReport) {
    this.send(MESSAGE_TYPES.LOGIN_ACTIVITY, report);
  }

  private connect() {
    if (this.stopped) {
      return;
    }

    const socket = this.options.tlsEnabled ? this.createTlsSocket() : new Socket();
    this.socket = socket;
    this.remainder = Buffer.alloc(0);

    if (!this.options.tlsEnabled) {
      socket.connect(this.options.serverPort, this.options.serverHost);
    }

    socket.on("connect", () => {
      this.isConnected = true;
      this.logger.info(
        {
          serverHost: this.options.serverHost,
          serverPort: this.options.serverPort,
          tlsEnabled: this.options.tlsEnabled ?? false
        },
        "Connected to server"
      );

      this.sendHandshake();
      this.flushPendingFrames();
      this.startHeartbeat();
    });

    socket.on("data", (chunk) => {
      const decoded = decodeFrames(chunk, this.remainder);
      this.remainder = decoded.remainder;

      for (const frame of decoded.frames) {
        if (frame.messageType === MESSAGE_TYPES.ACK) {
          const ack = frame.payload as AckMessage;
          this.logger.debug({ ack }, "ACK received");
        }
      }
    });

    socket.on("error", (error) => {
      this.logger.error({ error }, "TCP connection error");
    });

    socket.on("close", () => {
      this.isConnected = false;
      this.logger.warn("TCP connection closed");

      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }

      this.scheduleReconnect();
    });
  }

  private createTlsSocket() {
    const ca =
      this.options.tlsCaPath && existsSync(this.options.tlsCaPath)
        ? readFileSync(this.options.tlsCaPath)
        : undefined;

    return connectTls({
      host: this.options.serverHost,
      port: this.options.serverPort,
      ...(ca ? { ca } : {}),
      rejectUnauthorized: Boolean(ca)
    });
  }

  private scheduleReconnect() {
    if (this.stopped || this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      const heartbeat: HeartbeatMessage = {
        agentId: this.options.agentId,
        sentAt: new Date().toISOString()
      };

      this.send(MESSAGE_TYPES.HEARTBEAT, heartbeat);
    }, this.options.collectIntervalMs);
  }

  private sendHandshake() {
    const handshake: AgentHandshake = {
      agentId: this.options.agentId,
      hostname: this.options.agentName,
      ipAddress: this.resolveIpAddress(),
      osInfo: {
        platform: os.platform(),
        distro: os.type(),
        kernelVersion: os.release(),
        architecture: os.arch(),
        uptimeSeconds: Math.floor(os.uptime())
      },
      version: "0.1.0"
    };

    this.send(MESSAGE_TYPES.HANDSHAKE, handshake);
  }

  private resolveIpAddress() {
    const interfaces = os.networkInterfaces();

    for (const networkInterface of Object.values(interfaces)) {
      if (!networkInterface) {
        continue;
      }

      const ipv4 = networkInterface.find(
        (address) => address.family === "IPv4" && address.internal === false
      );

      if (ipv4) {
        return ipv4.address;
      }
    }

    return "127.0.0.1";
  }

  private send(messageType: MessageType, payload: unknown) {
    const frame = encodeFrame(messageType, payload);

    if (!this.socket || this.socket.destroyed || !this.isConnected) {
      if (this.pendingFrames.length >= 200) {
        this.pendingFrames.shift();
      }

      this.pendingFrames.push(frame);
      return;
    }

    this.socket.write(frame);
  }

  private flushPendingFrames() {
    if (!this.socket || this.socket.destroyed) {
      return;
    }

    for (const frame of this.pendingFrames) {
      this.socket.write(frame);
    }

    this.pendingFrames.length = 0;
  }
}
