import { Badge } from "../../../components/ui/badge.js";

export function SeverityBadge({ severity }: { severity: string }) {
  const variant =
    severity === "critical"
      ? "destructive"
      : severity === "warning"
        ? "warning"
        : "muted";

  return <Badge variant={variant}>{severity}</Badge>;
}
