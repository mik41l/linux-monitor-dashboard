import {
  calculateCpuUsage,
  parseCpuSnapshot
} from "../packages/agent/src/collectors/cpu.collector.js";
import { parseDiskstats, parseDfOutput } from "../packages/agent/src/collectors/disk.collector.js";
import { parseMeminfo } from "../packages/agent/src/collectors/memory.collector.js";
import {
  parseNetworkDeviceMetrics,
  summarizeSockets
} from "../packages/agent/src/collectors/network.collector.js";
import { parseProcessMetricRecord } from "../packages/agent/src/collectors/process.collector.js";

describe("collector parsers", () => {
  it("parses cpu snapshots and usage deltas", () => {
    const previous = parseCpuSnapshot("cpu  100 0 50 400 10 0 0 0 0 0\n");
    const current = parseCpuSnapshot("cpu  120 0 70 420 10 0 0 0 0 0\n");

    expect(previous).toEqual({ idle: 410, total: 560 });
    expect(current).toEqual({ idle: 430, total: 620 });
    expect(calculateCpuUsage(previous, current)).toBeCloseTo(66.67, 2);
  });

  it("parses meminfo into bytes", () => {
    const meminfo = parseMeminfo([
      "MemTotal:       16384 kB",
      "MemFree:         4096 kB",
      "MemAvailable:    8192 kB",
      "SwapTotal:       2048 kB",
      "SwapFree:        1024 kB"
    ].join("\n"));

    expect(meminfo.get("MemTotal")).toBe(16384 * 1024);
    expect(meminfo.get("MemAvailable")).toBe(8192 * 1024);
    expect(meminfo.get("SwapFree")).toBe(1024 * 1024);
  });

  it("parses network devices and socket summary", () => {
    const socketSummary = summarizeSockets([
      "tcp LISTEN 0 128 0.0.0.0:22 0.0.0.0:* users:((\"sshd\",pid=10,fd=3))",
      "tcp ESTAB 0 0 10.0.0.2:22 10.0.0.3:5555 users:((\"sshd\",pid=10,fd=4))",
      "udp UNCONN 0 0 0.0.0.0:68 0.0.0.0:* users:((\"dhclient\",pid=12,fd=6))"
    ].join("\n"));
    const metrics = parseNetworkDeviceMetrics(
      [
        "Inter-|   Receive                                                |  Transmit",
        " face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed",
        "  lo: 100 1 0 0 0 0 0 0 100 1 0 0 0 0 0 0",
        "eth0: 200 2 0 0 0 0 0 0 300 3 0 0 0 0 0 0"
      ].join("\n"),
      socketSummary
    );

    expect(socketSummary).toEqual({
      tcpConnections: 2,
      udpConnections: 1,
      listeningPorts: 1
    });
    expect(metrics).toEqual([
      {
        interfaceName: "eth0",
        rxBytes: 200,
        rxPackets: 2,
        txBytes: 300,
        txPackets: 3,
        tcpConnections: 2,
        udpConnections: 1,
        listeningPorts: 1
      }
    ]);
  });

  it("parses process stat records", () => {
    const metric = parseProcessMetricRecord({
      pid: "321",
      stat: "321 (node server.js) S 1 1 1 0 -1 4194560 0 0 0 0 200 100 0 0 20 0 1 0 100 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0",
      statm: "1000 200 0 0 0 0 0",
      uptimeSeconds: 10,
      totalMemory: 1024 * 1024 * 1024
    });

    expect(metric).toMatchObject({
      pid: 321,
      command: "node server.js",
      state: "S",
      rssBytes: 200 * 4096
    });
    expect(metric?.cpuPercent).toBeGreaterThan(0);
    expect(metric?.memoryPercent).toBeGreaterThan(0);
  });

  it("parses diskstats and df output", () => {
    const diskstats = parseDiskstats("8 0 sda 10 0 20 0 30 0 40 0 0 0 0 0\n");
    const disks = parseDfOutput(
      [
        "Filesystem 1024-blocks Used Available Capacity Mounted on",
        "/dev/sda 1000 600 400 60% /"
      ].join("\n"),
      diskstats
    );

    expect(disks).toEqual([
      {
        device: "/dev/sda",
        mountPoint: "/",
        totalBytes: 1000 * 1024,
        usedBytes: 600 * 1024,
        freeBytes: 400 * 1024,
        usagePercent: 60,
        readOps: 10,
        writeOps: 30,
        readBytes: 20 * 512,
        writeBytes: 40 * 512
      }
    ]);
  });
});
