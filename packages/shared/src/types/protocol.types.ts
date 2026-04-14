import type { AgentHandshake } from "./agents.types.js";
import type { Alert } from "./alerts.types.js";
import type { MetricData } from "./metrics.types.js";
import type { SecurityEvent } from "./events.types.js";
import type { SshdAuditResult } from "./sshd.types.js";

export const MESSAGE_TYPES = {
  HANDSHAKE: 0x01,
  METRICS: 0x02,
  SECURITY_EVENT: 0x03,
  HEARTBEAT: 0x04,
  ACK: 0x05,
  ALERT: 0x06,
  CONFIG_UPDATE: 0x07,
  SSHD_AUDIT: 0x08
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

export interface HeartbeatMessage {
  agentId: string;
  sentAt: string;
}

export interface AckMessage {
  receivedType: MessageType;
  message: string;
  receivedAt: string;
}

export interface ConfigUpdateMessage {
  collectIntervalMs?: number;
  securityChecksEnabled?: boolean;
}

export interface ProtocolFrame<TPayload = unknown> {
  messageType: MessageType;
  payload: TPayload;
}

export type ProtocolMessage =
  | ProtocolFrame<AgentHandshake>
  | ProtocolFrame<MetricData>
  | ProtocolFrame<SecurityEvent>
  | ProtocolFrame<SshdAuditResult>
  | ProtocolFrame<HeartbeatMessage>
  | ProtocolFrame<AckMessage>
  | ProtocolFrame<Alert>
  | ProtocolFrame<ConfigUpdateMessage>;
