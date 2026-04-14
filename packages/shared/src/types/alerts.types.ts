import type { SeverityLevel } from "../constants/severity.js";

export type AlertStatus = "open" | "acknowledged" | "resolved";

export interface Alert {
  id: number;
  ruleName: string;
  severity: SeverityLevel;
  agentId?: string;
  message: string;
  relatedEvents: string[];
  status: AlertStatus;
  createdAt: string;
  resolvedAt?: string;
}

export interface AlertRule {
  id: number;
  name: string;
  description?: string;
  condition: Record<string, unknown>;
  severity: SeverityLevel;
  isEnabled: boolean;
  createdAt: string;
}

