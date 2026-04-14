import type { ColumnDef } from "@tanstack/react-table";

import type { ActiveSession as ActiveSessionRecord, LoginActivityReport, LoginRecord } from "@monitor/shared";

import { DataTable } from "../../../components/data-table/DataTable.js";
import { Badge } from "../../../components/ui/badge.js";
import { Card, CardContent } from "../../../components/ui/card.js";
import { useLanguage } from "../../../context/LanguageContext.js";
import { translateAuditStatus } from "../../../lib/labels.js";

function getVariant(status: LoginActivityReport["status"] | undefined) {
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

export function ActiveSessions({ report }: { report: LoginActivityReport | null }) {
  const { t } = useLanguage();
  const activeSessions = report?.activeSessions ?? [];
  const failedLogins = report?.failedLogins ?? [];
  const successfulLogins = report?.successfulLogins ?? [];
  const sessionColumns: Array<ColumnDef<ActiveSessionRecord>> = [
    { accessorKey: "user", header: t("user") },
    { accessorKey: "tty", header: "TTY" },
    { accessorKey: "from", header: t("source") },
    { accessorKey: "loginAt", header: t("login") },
    { accessorKey: "idle", header: t("idle") },
    { accessorKey: "command", header: t("command") }
  ];
  const failedColumns: Array<ColumnDef<LoginRecord>> = [
    { accessorKey: "user", header: t("user") },
    { accessorKey: "from", header: t("source") },
    { accessorKey: "loginAt", header: t("login") },
    {
      accessorKey: "status",
      header: t("status"),
      cell: ({ row }) => translateAuditStatus(row.original.status, t)
    }
  ];

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("loginActivity")}</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{t("sessionsAndAuthHistory")}</h3>
          </div>
          <Badge variant={getVariant(report?.status)}>
            {translateAuditStatus(report?.status ?? "unavailable", t)} · {report?.riskScore ?? 0}
          </Badge>
        </div>

        {report?.findings && report.findings.length > 0 ? (
          <div className="space-y-2">
            {report.findings.map((finding) => (
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
                    {translateAuditStatus(finding.severity, t)}
                  </Badge>
                  <p className="text-sm font-medium text-white">{finding.key}</p>
                </div>
                <p className="mt-2 text-sm text-slate-300">{finding.message}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">{t("activeSessionsLabel")}</p>
            <p className="mt-2 text-lg font-medium text-white">{activeSessions.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">{t("failedLogins")}</p>
            <p className="mt-2 text-lg font-medium text-white">{failedLogins.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">{t("successfulLogins")}</p>
            <p className="mt-2 text-lg font-medium text-white">{successfulLogins.length}</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <DataTable
            columns={sessionColumns}
            data={activeSessions}
            emptyMessage={t("noActiveSessions")}
          />
          <DataTable
            columns={failedColumns}
            data={failedLogins}
            emptyMessage={report?.error ?? t("noFailedLogins")}
          />
        </div>
      </CardContent>
    </Card>
  );
}
