import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { OpenPort, PortScanReport, SecurityEvent } from "@monitor/shared";

const execFileAsync = promisify(execFile);

const KNOWN_PORTS: Record<number, { serviceName: string; publicRisk: "safe" | "warning" | "danger" }> = {
  22: { serviceName: "ssh", publicRisk: "safe" },
  80: { serviceName: "http", publicRisk: "safe" },
  443: { serviceName: "https", publicRisk: "safe" },
  3306: { serviceName: "mysql", publicRisk: "danger" },
  5432: { serviceName: "postgresql", publicRisk: "danger" },
  6379: { serviceName: "redis", publicRisk: "danger" },
  27017: { serviceName: "mongodb", publicRisk: "danger" }
};

function parseEndpoint(rawEndpoint: string) {
  const endpoint = rawEndpoint.trim();

  if (endpoint.startsWith("[")) {
    const separatorIndex = endpoint.lastIndexOf("]:");
    if (separatorIndex !== -1) {
      return {
        address: endpoint.slice(1, separatorIndex),
        port: Number.parseInt(endpoint.slice(separatorIndex + 2), 10)
      };
    }
  }

  const separatorIndex = endpoint.lastIndexOf(":");
  if (separatorIndex === -1) {
    return {
      address: endpoint,
      port: 0
    };
  }

  return {
    address: endpoint.slice(0, separatorIndex),
    port: Number.parseInt(endpoint.slice(separatorIndex + 1), 10)
  };
}

function parseProcessInfo(segment: string) {
  const processMatch = segment.match(/"([^"]+)"/);
  const pidMatch = segment.match(/pid=(\d+)/);
  const pidValue = pidMatch?.[1];

  return {
    process: processMatch?.[1] ?? "unknown",
    pid: pidValue ? Number.parseInt(pidValue, 10) : undefined
  };
}

function isExposedAddress(address: string) {
  return ["0.0.0.0", "*", "::", "[::]"].includes(address);
}

export function parseSsOutput(protocol: "tcp" | "udp", output: string): OpenPort[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      const localAddress = parts[3] ?? "";
      const usersSegment = parts.slice(5).join(" ");
      const endpoint = parseEndpoint(localAddress);
      const knownService = KNOWN_PORTS[endpoint.port];
      const exposed = isExposedAddress(endpoint.address);
      const riskLevel =
        exposed && knownService?.publicRisk === "danger"
          ? "danger"
          : exposed && !knownService
            ? "warning"
            : knownService?.publicRisk === "danger"
              ? "warning"
              : "safe";
      const processInfo = parseProcessInfo(usersSegment);

      return {
        protocol,
        port: endpoint.port,
        address: endpoint.address || "*",
        process: processInfo.process,
        ...(processInfo.pid ? { pid: processInfo.pid } : {}),
        ...(knownService ? { serviceName: knownService.serviceName } : {}),
        isExposed: exposed,
        isKnownService: Boolean(knownService),
        riskLevel
      } satisfies OpenPort;
    })
    .filter((port) => port.port > 0);
}

export function buildPortScanResult(agentId: string, openPorts: OpenPort[]): PortScanReport {
  const findings = openPorts
    .filter((port) => port.riskLevel !== "safe")
    .map((port) => {
      if (port.isExposed && port.serviceName) {
        return `${port.serviceName} is exposed on ${port.address}:${port.port}`;
      }

      if (port.isExposed) {
        return `Unexpected public listener on ${port.address}:${port.port}`;
      }

      return `Sensitive service detected on ${port.address}:${port.port}`;
    });
  const riskScore = openPorts.reduce((sum, port) => {
    if (port.riskLevel === "danger") {
      return sum + 25;
    }

    if (port.riskLevel === "warning") {
      return sum + 10;
    }

    return sum;
  }, 0);
  const status =
    openPorts.some((port) => port.riskLevel === "danger")
      ? "critical"
      : openPorts.some((port) => port.riskLevel === "warning")
        ? "warning"
        : "ok";

  return {
    agentId,
    collectedAt: new Date().toISOString(),
    isAvailable: true,
    status,
    riskScore,
    openPorts,
    findings
  };
}

export function buildPortSecurityEvents(report: PortScanReport): SecurityEvent[] {
  return report.openPorts
    .filter((port) => port.riskLevel !== "safe")
    .map((port) => ({
      agentId: report.agentId,
      eventType: "network.unexpected_open_port",
      severity: port.riskLevel === "danger" ? "critical" : "warning",
      source: "port-scan.collector",
      message: `Open ${port.protocol.toUpperCase()} port detected on ${port.address}:${port.port}`,
      details: {
        protocol: port.protocol,
        port: port.port,
        address: port.address,
        process: port.process,
        pid: port.pid,
        riskLevel: port.riskLevel,
        serviceName: port.serviceName
      },
      occurredAt: report.collectedAt
    }));
}

export class PortScanCollector {
  private lastCollectedAt = 0;
  private cached: PortScanReport | null = null;

  public constructor(private readonly intervalMs = 60 * 1000) {}

  public async collect(agentId: string): Promise<{ report: PortScanReport; events: SecurityEvent[] }> {
    const now = Date.now();

    if (this.cached && now - this.lastCollectedAt < this.intervalMs) {
      return {
        report: this.cached,
        events: []
      };
    }

    try {
      const [tcpResult, udpResult] = await Promise.all([
        execFileAsync("ss", ["-tlnpH"]),
        execFileAsync("ss", ["-ulnpH"])
      ]);

      const openPorts = [
        ...parseSsOutput("tcp", tcpResult.stdout),
        ...parseSsOutput("udp", udpResult.stdout)
      ].sort((left, right) => left.port - right.port);
      const report = buildPortScanResult(agentId, openPorts);
      this.cached = report;
      this.lastCollectedAt = now;

      return {
        report,
        events: buildPortSecurityEvents(report)
      };
    } catch (error) {
      const report = {
        agentId,
        collectedAt: new Date().toISOString(),
        isAvailable: false,
        status: "unavailable",
        riskScore: 0,
        openPorts: [],
        findings: [],
        error: error instanceof Error ? error.message : "Port scan failed"
      } satisfies PortScanReport;

      this.cached = report;
      this.lastCollectedAt = now;

      return {
        report,
        events: []
      };
    }
  }
}
