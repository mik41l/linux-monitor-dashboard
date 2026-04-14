import type { MessageType, ProtocolFrame } from "./types.js";

export function encodeFrame<TPayload>(
  messageType: MessageType,
  payload: TPayload
): Buffer {
  const payloadBuffer = Buffer.from(JSON.stringify(payload), "utf8");
  const messageLength = 1 + payloadBuffer.length;
  const frameBuffer = Buffer.allocUnsafe(4 + messageLength);

  frameBuffer.writeUInt32BE(messageLength, 0);
  frameBuffer.writeUInt8(messageType, 4);
  payloadBuffer.copy(frameBuffer, 5);

  return frameBuffer;
}

export function createFrame<TPayload>(
  messageType: MessageType,
  payload: TPayload
): ProtocolFrame<TPayload> {
  return { messageType, payload };
}

