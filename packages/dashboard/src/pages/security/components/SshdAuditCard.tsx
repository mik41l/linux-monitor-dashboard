import type { SshdAuditResult } from "@monitor/shared";

import { Badge } from "../../../components/ui/badge.js";
import { Card, CardContent } from "../../../components/ui/card.js";

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
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">SSHD audit</p>
            <h3 className="mt-2 text-xl font-semibold text-white">SSH configuration posture</h3>
          </div>
          <Badge variant={getVariant(audit?.status)}>
            {audit?.status ?? "unavailable"} · {audit?.riskScore ?? 0}
          </Badge>
        </div>

        {!audit ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
            No SSH audit was received yet.
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-400">PermitRootLogin</p>
                <p className="mt-2 text-sm text-white">{audit.permitRootLogin ?? "not set"}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-400">PasswordAuthentication</p>
                <p className="mt-2 text-sm text-white">{audit.passwordAuthentication ?? "not set"}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-400">Port</p>
                <p className="mt-2 text-sm text-white">{audit.port ?? "not set"}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-400">AllowUsers</p>
                <p className="mt-2 text-sm text-white">
                  {audit.allowUsers.length > 0 ? audit.allowUsers.join(", ") : "not set"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {audit.findings.length === 0 ? (
                <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100">
                  No risky SSHD settings were detected.
                </div>
              ) : (
                audit.findings.map((finding) => (
                  <div key={`${finding.key}-${finding.message}`} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
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
                        {finding.severity}
                      </Badge>
                      <p className="text-sm font-medium text-white">{finding.key}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{finding.message}</p>
                    <p className="mt-2 text-xs text-slate-500">{finding.recommendation}</p>
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
