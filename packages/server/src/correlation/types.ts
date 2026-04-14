export interface CorrelationAlertCandidate {
  ruleName: string;
  severity: "info" | "warning" | "critical";
  agentId?: string;
  message: string;
  relatedEvents?: string[];
}

