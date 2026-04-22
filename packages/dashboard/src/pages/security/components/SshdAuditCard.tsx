import type { SshdAuditResult } from "@monitor/shared";

import { Badge } from "../../../components/ui/badge.js";
import { Card, CardContent } from "../../../components/ui/card.js";
import { useLanguage } from "../../../context/LanguageContext.js";
import { translateAuditStatus } from "../../../lib/labels.js";

function getVariant(status: SshdAuditResult["status"] | undefined) {
  if (status === "critical") {
    return "destructive";
  }

  if (status === "warning") {
    return "warning";
  }

  if (status === "ok") {
    return "success";
  }

  return "muted";
}

export function SshdAuditCard({ audit }: { audit: SshdAuditResult | null }) {
  const { t } = useLanguage();

  return (
    <Card className="h-fit">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("sshdAudit")}</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{t("sshConfigurationPosture")}</h3>
          </div>
          <Badge variant={getVariant(audit?.status)}>
            {translateAuditStatus(audit?.status ?? "unavailable", t)} · {audit?.riskScore ?? 0}
          </Badge>
        </div>

        {!audit ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
            {t("noSshdAuditYet")}
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-sm text-slate-400">{t("permitRootLogin")}</p>
                <p className="mt-2 text-sm text-white">{audit.permitRootLogin ?? t("notSet")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-sm text-slate-400">{t("passwordAuthentication")}</p>
                <p className="mt-2 text-sm text-white">{audit.passwordAuthentication ?? t("notSet")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-sm text-slate-400">{t("port")}</p>
                <p className="mt-2 text-sm text-white">{audit.port ?? t("notSet")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-sm text-slate-400">{t("allowUsers")}</p>
                <p className="mt-2 text-sm text-white">
                  {audit.allowUsers.length > 0 ? audit.allowUsers.join(", ") : t("notSet")}
                </p>
              </div>
            </div>

            {audit.error ? (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">
                {audit.error}
              </div>
            ) : null}

            <div className="grid gap-3 xl:grid-cols-2">
              {audit.findings.length === 0 ? (
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100 xl:col-span-2">
                  {t("noRiskySshdSettings")}
                </div>
              ) : (
                audit.findings.map((finding) => (
                  <div
                    key={`${finding.key}-${finding.message}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          finding.severity === "critical"
                            ? "destructive"
                            : finding.severity === "warning"
                              ? "warning"
                              : "muted"
                        }
                      >
                        {translateAuditStatus(finding.severity, t)}
                      </Badge>
                      <p className="text-sm font-medium text-white">{finding.key}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{finding.message}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{finding.recommendation}</p>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
