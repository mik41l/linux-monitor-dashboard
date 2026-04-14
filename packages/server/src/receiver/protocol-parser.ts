import {
  MESSAGE_TYPES,
  decodeFrames,
  type AgentHandshake,
  type HeartbeatMessage,
  type MetricData,
  type ProtocolFrame,
  type SecurityEvent
} from "@monitor/shared";

export type ParsedFrame =
  | ProtocolFrame<AgentHandshake>
  | ProtocolFrame<HeartbeatMessage>
  | ProtocolFrame<MetricData>
  | ProtocolFrame<SecurityEvent>
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
