export const SEVERITY_LEVELS = ["info", "warning", "critical"] as const;

export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

