import type { ColumnDef } from "@tanstack/react-table";

import type { OpenPort, PortScanReport } from "@monitor/shared";

import { DataTable } from "../../../components/data-table/DataTable.js";
import { Badge } from "../../../components/ui/badge.js";
import { Card, CardContent } from "../../../components/ui/card.js";

const columns: Array<ColumnDef<OpenPort>> = [
  {
    accessorKey: "protocol",
    header: "Proto"
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => `${row.original.address}:${row.original.port}`
  },
  {
    accessorKey: "process",
    header: "Process",
    cell: ({ row }) => row.original.serviceName ?? row.original.process
  },
  {
    accessorKey: "riskLevel",
    header: "Risk",
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
        {row.original.riskLevel}
      </Badge>
    )
  }
];

export function PortsTable({ report }: { report: PortScanReport | null }) {
  const variant =
    report?.status === "critical"
      ? "destructive"
      : report?.status === "warning"
        ? "warning"
        : report?.status === "ok"
          ? "success"
          : "muted";

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Open ports</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Listening socket inventory</h3>
          </div>
          <Badge variant={variant}>
            {report?.status ?? "unavailable"} · {report?.riskScore ?? 0}
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

        <DataTable
          columns={columns}
          data={report?.openPorts ?? []}
          emptyMessage={report?.error ?? "No listening ports were reported."}
        />
      </CardContent>
    </Card>
  );
}
