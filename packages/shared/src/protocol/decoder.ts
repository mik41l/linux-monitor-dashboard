import type { MessageType, ProtocolFrame } from "./types.js";

export interface DecodedFrames {
  frames: ProtocolFrame[];
  remainder: Buffer<ArrayBufferLike>;
}

function decodeSingleFrame<TPayload>(
  buffer: Buffer<ArrayBufferLike>
): ProtocolFrame<TPayload> {
  const messageLength = buffer.readUInt32BE(0);
  const messageType = buffer.readUInt8(4) as MessageType;
  const payloadBuffer = buffer.subarray(5, 4 + messageLength);
  const payload = JSON.parse(payloadBuffer.toString("utf8")) as TPayload;

  return {
    messageType,
    payload
  };
}

export function decodeFrame<TPayload>(
  buffer: Buffer<ArrayBufferLike>
): ProtocolFrame<TPayload> {
  const messageLength = buffer.readUInt32BE(0);
  const expectedFrameLength = 4 + messageLength;

  if (buffer.length !== expectedFrameLength) {
    throw new Error("Frame length mismatch");
  }

  return decodeSingleFrame<TPayload>(buffer);
}

export function decodeFrames(
  chunk: Buffer<ArrayBufferLike>,
  remainder: Buffer<ArrayBufferLike> = Buffer.alloc(0)
): DecodedFrames {
  const combined = Buffer.concat([remainder, chunk]);
  const frames: ProtocolFrame[] = [];

  let offset = 0;

  while (combined.length - offset >= 4) {
    const messageLength = combined.readUInt32BE(offset);
    const frameLength = 4 + messageLength;

    if (combined.length - offset < frameLength) {
      break;
    }

    const frameBuffer = combined.subarray(offset, offset + frameLength);
    frames.push(decodeSingleFrame(frameBuffer));
    offset += frameLength;
  }

  return {
    frames,
    remainder: combined.subarray(offset)
  };
}
