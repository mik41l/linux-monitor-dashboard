import { formatTimestamp } from "../../../lib/format.js";
import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import { Card, CardContent } from "../../../components/ui/card.js";
import { useLanguage } from "../../../context/LanguageContext.js";
import { translateAuditStatus, translateSeverity } from "../../../lib/labels.js";

interface AlertCardProps {
  alert: {
    id: number;
    ruleName: string;
    severity: string;
    agentId: string | null;
    message: string;
    status: string;
    createdAt: string;
  };
  language: "tr" | "ru";
  resolveLabel: string;
  globalLabel: string;
  onResolve: (id: number) => void;
}

export function AlertCard({
  alert,
  language,
  resolveLabel,
  globalLabel,
  onResolve
}: AlertCardProps) {
  const variant =
    alert.severity === "critical"
      ? "destructive"
      : alert.severity === "warning"
        ? "warning"
      : "muted";
  const { t } = useLanguage();

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-slate-400">{alert.ruleName}</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{alert.message}</h3>
            <p className="mt-3 text-sm text-slate-500">
              {alert.agentId ?? globalLabel} • {formatTimestamp(alert.createdAt, language)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={variant}>{translateSeverity(alert.severity, t)}</Badge>
            {alert.status === "open" ? (
              <Button onClick={() => onResolve(alert.id)} type="button">
                {resolveLabel}
              </Button>
            ) : (
              <Badge variant="muted">{translateAuditStatus(alert.status, t)}</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
