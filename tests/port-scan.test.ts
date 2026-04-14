import {
  buildPortScanResult,
  buildPortSecurityEvents,
  parseSsOutput
} from "../packages/agent/src/security/port-scan.collector.js";

describe("port scan collector", () => {
  it("parses ss output into open ports", () => {
    const ports = parseSsOutput(
      "tcp",
      [
        'LISTEN 0 128 0.0.0.0:5432 0.0.0.0:* users:(("postgres",pid=77,fd=5))',
        'LISTEN 0 128 127.0.0.1:3000 0.0.0.0:* users:(("node",pid=12,fd=6))'
      ].join("\n")
    );

    expect(ports).toEqual([
      {
        protocol: "tcp",
        port: 5432,
        address: "0.0.0.0",
        process: "postgres",
        pid: 77,
        serviceName: "postgresql",
        isExposed: true,
        isKnownService: true,
        riskLevel: "danger"
      },
      {
        protocol: "tcp",
        port: 3000,
        address: "127.0.0.1",
        process: "node",
        pid: 12,
        isExposed: false,
        isKnownService: false,
        riskLevel: "safe"
      }
    ]);
  });

  it("builds scan reports and security events for risky listeners", () => {
    const report = buildPortScanResult("agent-1", [
      {
        protocol: "tcp",
        port: 5432,
        address: "0.0.0.0",
        process: "postgres",
        serviceName: "postgresql",
        isExposed: true,
        isKnownService: true,
        riskLevel: "danger"
      },
      {
        protocol: "udp",
        port: 9999,
        address: "0.0.0.0",
        process: "unknown",
        isExposed: true,
        isKnownService: false,
        riskLevel: "warning"
      }
    ]);
    const events = buildPortSecurityEvents(report);

    expect(report.status).toBe("critical");
    expect(report.riskScore).toBe(35);
    expect(report.findings).toHaveLength(2);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "network.unexpected_open_port",
          severity: "critical"
        }),
        expect.objectContaining({
          eventType: "network.unexpected_open_port",
          severity: "warning"
        })
      ])
    );
  });
});
