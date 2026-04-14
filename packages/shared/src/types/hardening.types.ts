export type HardeningCheckStatus = "pass" | "fail" | "warning";
export type HardeningReportStatus = "ok" | "warning" | "critical" | "unavailable";

export interface HardeningCheck {
  category: string;
  check: string;
  status: HardeningCheckStatus;
  detail: string;
  recommendation: string;
}

export interface HardeningReport {
  agentId: string;
  collectedAt: string;
  isAvailable: boolean;
  status: HardeningReportStatus;
  overallScore: number;
  categoryScores: Record<string, number>;
  checks: HardeningCheck[];
  recommendations: string[];
  error?: string;
}
