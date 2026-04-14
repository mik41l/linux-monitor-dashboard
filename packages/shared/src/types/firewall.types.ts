import type { SeverityLevel } from "../constants/severity.js";

export interface FirewallRule {
  chain: "INPUT" | "OUTPUT" | "FORWARD";
  target: "ACCEPT" | "DROP" | "REJECT" | "LOG" | "UNKNOWN";
  protocol: string;
  source: string;
  destination: string;
  port?: number;
  lineNumber?: number;
}

export interface FirewallFinding {
  key: string;
  severity: SeverityLevel;
  message: string;
  recommendation: string;
}

export type FirewallAuditStatus = "ok" | "warning" | "critical" | "unavailable";
export type FirewallBackend = "iptables" | "nftables" | "none";

export interface FirewallAudit {
  agentId: string;
  collectedAt: string;
  isAvailable: boolean;
  status: FirewallAuditStatus;
  backend: FirewallBackend;
  isEnabled: boolean;
  defaultPolicy: {
    input: string;
    output: string;
    forward: string;
  };
  totalRules: number;
  openPorts: number[];
  rules: FirewallRule[];
  findings: FirewallFinding[];
  riskScore: number;
  error?: string;
}
