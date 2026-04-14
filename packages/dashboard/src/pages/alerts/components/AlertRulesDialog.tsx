import { useState } from "react";

import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import { Card, CardContent } from "../../../components/ui/card.js";
import { useLanguage } from "../../../context/LanguageContext.js";
import { translateSeverity } from "../../../lib/labels.js";

interface AlertRuleRecord {
  id: number;
  name: string;
  description: string | null;
  severity: string;
  isEnabled: boolean;
}

interface AlertRulesDialogProps {
  title: string;
  rules: AlertRuleRecord[];
  onToggle: (id: number, nextValue: boolean) => void;
}

export function AlertRulesDialog({ title, rules, onToggle }: AlertRulesDialogProps) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button" variant="outline">
        {title}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur">
          <Card className="w-full max-w-3xl">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {t("alertRulesHint")}
                  </p>
                </div>
                <Button onClick={() => setOpen(false)} type="button" variant="ghost">
                  {t("close")}
                </Button>
              </div>
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div>
                      <p className="font-medium text-white">{rule.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {rule.description ?? t("noDescription")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          rule.severity === "critical"
                            ? "destructive"
                            : rule.severity === "warning"
                              ? "warning"
                              : "muted"
                        }
                      >
                        {translateSeverity(rule.severity, t)}
                      </Badge>
                      <Button
                        onClick={() => onToggle(rule.id, !rule.isEnabled)}
                        type="button"
                        variant={rule.isEnabled ? "default" : "outline"}
                      >
                        {rule.isEnabled ? t("enabled") : t("disabled")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
