import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getJson, putJson } from "../../api/client.js";
import { Card, CardContent } from "../../components/ui/card.js";
import { Select } from "../../components/ui/select.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { AlertCard } from "./components/AlertCard.js";
import { AlertRulesDialog } from "./components/AlertRulesDialog.js";

interface AlertRecord {
  id: number;
  ruleName: string;
  severity: string;
  agentId: string | null;
  message: string;
  status: string;
  createdAt: string;
}

interface AlertRuleRecord {
  id: number;
  name: string;
  description: string | null;
  severity: string;
  isEnabled: boolean;
}

export function AlertsPage() {
  const { language, t } = useLanguage();
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["alerts", status, severity],
    queryFn: () => getJson<AlertRecord[]>("/api/alerts", { status, severity })
  });
  const { data: rulesData } = useQuery({
    queryKey: ["alert-rules"],
    queryFn: () => getJson<AlertRuleRecord[]>("/api/alerts/rules")
  });
  const resolveMutation = useMutation({
    mutationFn: (id: number) => putJson<{ success: boolean }>(`/api/alerts/${id}/resolve`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    }
  });
  const ruleMutation = useMutation({
    mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) =>
      putJson<AlertRuleRecord, { isEnabled: boolean }>(`/api/alerts/rules/${id}`, { isEnabled }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
    }
  });

  const alerts = data?.data ?? [];
  const rules = rulesData?.data ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">{t("alerts")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{t("alertDesk")}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="">All status</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </Select>
            <Select onChange={(event) => setSeverity(event.target.value)} value={severity}>
              <option value="">All severity</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </Select>
            <AlertRulesDialog
              onToggle={(id, isEnabled) => ruleMutation.mutate({ id, isEnabled })}
              rules={rules}
              title="Alert rules"
            />
          </div>
        </CardContent>
      </Card>

      {alerts.length === 0 ? (
        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-sm text-slate-400">
          {t("noAlertRecords")}
        </div>
      ) : (
        alerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            globalLabel={t("global")}
            language={language}
            onResolve={(id) => resolveMutation.mutate(id)}
            resolveLabel={t("resolve")}
          />
        ))
      )}
    </div>
  );
}
