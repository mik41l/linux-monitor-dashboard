import type { ColumnDef } from "@tanstack/react-table";

import type { ActiveSession as ActiveSessionRecord, LoginActivityReport, LoginRecord } from "@monitor/shared";

import { DataTable } from "../../../components/data-table/DataTable.js";
import { Badge } from "../../../components/ui/badge.js";
import { Card, CardContent } from "../../../components/ui/card.js";

const sessionColumns: Array<ColumnDef<ActiveSessionRecord>> = [
  { accessorKey: "user", header: "User" },
  { accessorKey: "tty", header: "TTY" },
  { accessorKey: "from", header: "Source" },
  { accessorKey: "loginAt", header: "Login" },
  { accessorKey: "idle", header: "Idle" },
  { accessorKey: "command", header: "Command" }
];

const failedColumns: Array<ColumnDef<LoginRecord>> = [
  { accessorKey: "user", header: "User" },
  { accessorKey: "from", header: "Source" },
  { accessorKey: "loginAt", header: "Login" },
  { accessorKey: "status", header: "Status" }
];

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
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Login activity</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Sessions and authentication history</h3>
          </div>
          <Badge variant={getVariant(report?.status)}>
            {report?.status ?? "unavailable"} · {report?.riskScore ?? 0}
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
                    {finding.severity}
                  </Badge>
                  <p className="text-sm font-medium text-white">{finding.key}</p>
                </div>
                <p className="mt-2 text-sm text-slate-300">{finding.message}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-4">
          <DataTable
            columns={sessionColumns}
            data={report?.activeSessions ?? []}
            emptyMessage="No active sessions were reported."
          />
          <DataTable
            columns={failedColumns}
            data={report?.failedLogins ?? []}
            emptyMessage={report?.error ?? "No failed login history was reported."}
          />
        </div>
      </CardContent>
    </Card>
  );
}
