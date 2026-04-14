import {
  MESSAGE_TYPES,
  decodeFrames,
  type AgentHandshake,
  type FirewallAudit,
  type HardeningReport,
  type HeartbeatMessage,
  type LoginActivityReport,
  type MetricData,
  type PortScanReport,
  type ProtocolFrame,
  type SecurityEvent,
  type SshdAuditResult
} from "@monitor/shared";

export type ParsedFrame =
  | ProtocolFrame<AgentHandshake>
  | ProtocolFrame<HeartbeatMessage>
  | ProtocolFrame<MetricData>
  | ProtocolFrame<SecurityEvent>
  | ProtocolFrame<SshdAuditResult>
  | ProtocolFrame<PortScanReport>
  | ProtocolFrame<FirewallAudit>
  | ProtocolFrame<HardeningReport>
  | ProtocolFrame<LoginActivityReport>
  | ProtocolFrame;

export function parseFrames(chunk: Buffer, remainder: Buffer) {
  return decodeFrames(chunk, remainder);
}

export function isHandshakeFrame(frame: ProtocolFrame): frame is ProtocolFrame<AgentHandshake> {
  return frame.messageType === MESSAGE_TYPES.HANDSHAKE;
}

export function isHeartbeatFrame(
  frame: ProtocolFrame
): frame is ProtocolFrame<HeartbeatMessage> {
  return frame.messageType === MESSAGE_TYPES.HEARTBEAT;
}

export function isMetricFrame(frame: ProtocolFrame): frame is ProtocolFrame<MetricData> {
  return frame.messageType === MESSAGE_TYPES.METRICS;
}

export function isSecurityEventFrame(
  frame: ProtocolFrame
): frame is ProtocolFrame<SecurityEvent> {
  return frame.messageType === MESSAGE_TYPES.SECURITY_EVENT;
}

export function isSshdAuditFrame(
  frame: ProtocolFrame
): frame is ProtocolFrame<SshdAuditResult> {
  return frame.messageType === MESSAGE_TYPES.SSHD_AUDIT;
}

export function isPortScanFrame(frame: ProtocolFrame): frame is ProtocolFrame<PortScanReport> {
  return frame.messageType === MESSAGE_TYPES.PORT_SCAN;
}

export function isFirewallAuditFrame(frame: ProtocolFrame): frame is ProtocolFrame<FirewallAudit> {
  return frame.messageType === MESSAGE_TYPES.FIREWALL_AUDIT;
}

export function isHardeningReportFrame(
  frame: ProtocolFrame
): frame is ProtocolFrame<HardeningReport> {
  return frame.messageType === MESSAGE_TYPES.HARDENING_REPORT;
}

export function isLoginActivityFrame(
  frame: ProtocolFrame
): frame is ProtocolFrame<LoginActivityReport> {
  return frame.messageType === MESSAGE_TYPES.LOGIN_ACTIVITY;
}
