export type PortRiskLevel = "safe" | "warning" | "danger";
export type PortScanStatus = "ok" | "warning" | "critical" | "unavailable";

export interface OpenPort {
  protocol: "tcp" | "udp";
  port: number;
  address: string;
  process: string;
  pid?: number;
  serviceName?: string;
  isExposed: boolean;
  isKnownService: boolean;
  riskLevel: PortRiskLevel;
}

export interface PortScanReport {
  agentId: string;
  collectedAt: string;
  isAvailable: boolean;
  status: PortScanStatus;
  riskScore: number;
  openPorts: OpenPort[];
  findings: string[];
  error?: string;
}
