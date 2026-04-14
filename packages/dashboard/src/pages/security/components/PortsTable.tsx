import type { ColumnDef } from "@tanstack/react-table";

import type { OpenPort, PortScanReport } from "@monitor/shared";

import { DataTable } from "../../../components/data-table/DataTable.js";
import { Badge } from "../../../components/ui/badge.js";
import { Card, CardContent } from "../../../components/ui/card.js";
import { useLanguage } from "../../../context/LanguageContext.js";
import { translateAuditStatus, translateRiskLevel } from "../../../lib/labels.js";

export function PortsTable({ report }: { report: PortScanReport | null }) {
  const { t } = useLanguage();
  const variant =
    report?.status === "critical"
      ? "destructive"
      : report?.status === "warning"
        ? "warning"
        : report?.status === "ok"
          ? "success"
          : "muted";
  const columns: Array<ColumnDef<OpenPort>> = [
    {
      accessorKey: "protocol",
      header: t("proto")
    },
    {
      accessorKey: "address",
      header: t("address"),
      cell: ({ row }) => `${row.original.address}:${row.original.port}`
    },
    {
      accessorKey: "process",
      header: t("process"),
      cell: ({ row }) => row.original.serviceName ?? row.original.process
    },
    {
      accessorKey: "riskLevel",
      header: t("risk"),
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.riskLevel === "danger"
              ? "destructive"
              : row.original.riskLevel === "warning"
                ? "warning"
                : "success"
          }
        >
          {translateRiskLevel(row.original.riskLevel, t)}
        </Badge>
      )
    }
  ];

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("openPortsTitle")}</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{t("listeningSocketExposure")}</h3>
          </div>
          <Badge variant={variant}>
            {translateAuditStatus(report?.status ?? "unavailable", t)} · {report?.riskScore ?? 0}
          </Badge>
        </div>

        {report?.findings && report.findings.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {report.findings.slice(0, 4).map((finding) => (
              <Badge key={finding} variant="warning">
                {finding}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">{t("listeningSockets")}</p>
            <p className="mt-2 text-lg font-medium text-white">{report?.openPorts.length ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">{t("exposedListeners")}</p>
            <p className="mt-2 text-lg font-medium text-white">
              {report?.openPorts.filter((port) => port.isExposed).length ?? 0}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">{t("criticalServices")}</p>
            <p className="mt-2 text-lg font-medium text-white">
              {report?.openPorts.filter((port) => port.riskLevel === "danger").length ?? 0}
            </p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={report?.openPorts ?? []}
          emptyMessage={report?.error ?? t("noOpenPortsReported")}
        />
      </CardContent>
    </Card>
  );
}
