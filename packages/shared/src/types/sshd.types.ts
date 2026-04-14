import type { SeverityLevel } from "../constants/severity.js";

export interface SshdFinding {
  key: string;
  severity: SeverityLevel;
  message: string;
  recommendation: string;
  observedValue?: string;
  expectedValue?: string;
}

export type SshdAuditStatus = "ok" | "warning" | "critical" | "unavailable";

export interface SshdAuditResult {
  agentId: string;
  configPath: string;
  collectedAt: string;
  isAvailable: boolean;
  status: SshdAuditStatus;
  riskScore: number;
  permitRootLogin?: string;
  passwordAuthentication?: string;
  port?: number;
  maxAuthTries?: number;
  permitEmptyPasswords?: string;
  x11Forwarding?: string;
  protocol?: string;
  usePAM?: string;
  loginGraceTime?: number;
  allowUsers: string[];
  findings: SshdFinding[];
  error?: string;
}
