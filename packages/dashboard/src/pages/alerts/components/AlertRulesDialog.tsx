import { useState } from "react";

import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import { Card, CardContent } from "../../../components/ui/card.js";

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
                    Correlation and threshold rule controls.
                  </p>
                </div>
                <Button onClick={() => setOpen(false)} type="button" variant="ghost">
                  Close
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
                        {rule.description ?? "No description"}
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
                        {rule.severity}
                      </Badge>
                      <Button
                        onClick={() => onToggle(rule.id, !rule.isEnabled)}
                        type="button"
                        variant={rule.isEnabled ? "default" : "outline"}
                      >
                        {rule.isEnabled ? "Enabled" : "Disabled"}
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
