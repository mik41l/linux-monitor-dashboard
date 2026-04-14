import type { SeverityLevel } from "../constants/severity.js";

export interface ActiveSession {
  user: string;
  tty: string;
  from: string;
  loginAt: string;
  idle: string;
  command: string;
}

export interface LoginRecord {
  user: string;
  tty: string;
  from: string;
  loginAt: string;
  status: "success" | "failure";
  raw: string;
}

export interface LoginActivityFinding {
  key: string;
  severity: SeverityLevel;
  message: string;
  recommendation: string;
}

export type LoginActivityStatus = "ok" | "warning" | "critical" | "unavailable";

export interface LoginActivityReport {
  agentId: string;
  collectedAt: string;
  isAvailable: boolean;
  status: LoginActivityStatus;
  riskScore: number;
  activeSessions: ActiveSession[];
  successfulLogins: LoginRecord[];
  failedLogins: LoginRecord[];
  findings: LoginActivityFinding[];
  error?: string;
}
