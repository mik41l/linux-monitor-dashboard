import {
  MESSAGE_TYPES,
  decodeFrame,
  decodeFrames,
  encodeFrame
} from "@monitor/shared";

describe("protocol encode/decode", () => {
  it("round-trips a frame payload", () => {
    const frame = encodeFrame(MESSAGE_TYPES.HEARTBEAT, {
      agentId: "agent-1",
      sentAt: "2026-04-15T00:00:00.000Z"
    });

    expect(decodeFrame(frame)).toEqual({
      messageType: MESSAGE_TYPES.HEARTBEAT,
      payload: {
        agentId: "agent-1",
        sentAt: "2026-04-15T00:00:00.000Z"
      }
    });
  });

  it("keeps incomplete data in remainder until the next chunk arrives", () => {
    const heartbeat = encodeFrame(MESSAGE_TYPES.HEARTBEAT, {
      agentId: "agent-1",
      sentAt: "2026-04-15T00:00:00.000Z"
    });
    const metric = encodeFrame(MESSAGE_TYPES.METRICS, {
      agentId: "agent-1",
      metricType: "cpu",
      value: {
        usagePercent: 87,
        loadAverage: [1, 0.5, 0.25],
        coreCount: 4
      },
      collectedAt: "2026-04-15T00:00:01.000Z"
    });

    const chunkA = Buffer.concat([heartbeat, metric.subarray(0, 8)]);
    const firstPass = decodeFrames(chunkA);
    expect(firstPass.frames).toHaveLength(1);
    expect(firstPass.remainder.length).toBeGreaterThan(0);

    const secondPass = decodeFrames(metric.subarray(8), firstPass.remainder);
    expect(secondPass.frames).toHaveLength(1);
    expect(secondPass.frames[0]?.messageType).toBe(MESSAGE_TYPES.METRICS);
    expect(secondPass.remainder).toHaveLength(0);
  });

  it("rejects invalid frame lengths", () => {
    const frame = encodeFrame(MESSAGE_TYPES.ACK, {
      receivedType: MESSAGE_TYPES.ACK,
      message: "ok",
      receivedAt: "2026-04-15T00:00:00.000Z"
    });

    expect(() => decodeFrame(frame.subarray(0, frame.length - 1))).toThrow("Frame length mismatch");
  });
});
