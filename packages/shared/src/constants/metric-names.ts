export const METRIC_NAMES = [
  "cpu",
  "memory",
  "disk",
  "network",
  "process"
] as const;

export type MetricName = (typeof METRIC_NAMES)[number];

