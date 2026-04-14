import { Badge } from "../../../components/ui/badge.js";
import { useLanguage } from "../../../context/LanguageContext.js";
import { translateSeverity } from "../../../lib/labels.js";

export function SeverityBadge({ severity }: { severity: string }) {
  const { t } = useLanguage();
  const variant =
    severity === "critical"
      ? "destructive"
      : severity === "warning"
        ? "warning"
        : "muted";

  return <Badge variant={variant}>{translateSeverity(severity, t)}</Badge>;
}
