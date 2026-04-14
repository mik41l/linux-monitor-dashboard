import type { ColumnDef } from "@tanstack/react-table";

import type { FirewallAudit, FirewallRule } from "@monitor/shared";

import { DataTable } from "../../../components/data-table/DataTable.js";
import { Badge } from "../../../components/ui/badge.js";
import { Card, CardContent } from "../../../components/ui/card.js";

const columns: Array<ColumnDef<FirewallRule>> = [
  { accessorKey: "chain", header: "Chain" },
  { accessorKey: "target", header: "Target" },
  { accessorKey: "protocol", header: "Proto" },
  { accessorKey: "source", header: "Source" },
  { accessorKey: "destination", header: "Destination" },
  {
    accessorKey: "port",
    header: "Port",
    cell: ({ row }) => row.original.port ?? "n/a"
  }
];

function getVariant(status: FirewallAudit["status"] | undefined) {
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

export function FirewallStatus({ audit }: { audit: FirewallAudit | null }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Firewall</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Policy and rule coverage</h3>
          </div>
          <Badge variant={getVariant(audit?.status)}>
            {audit?.status ?? "unavailable"} · {audit?.riskScore ?? 0}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">Backend</p>
            <p className="mt-2 text-sm text-white">{audit?.backend ?? "none"}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">INPUT</p>
            <p className="mt-2 text-sm text-white">{audit?.defaultPolicy.input ?? "unknown"}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">OUTPUT</p>
            <p className="mt-2 text-sm text-white">{audit?.defaultPolicy.output ?? "unknown"}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">FORWARD</p>
            <p className="mt-2 text-sm text-white">{audit?.defaultPolicy.forward ?? "unknown"}</p>
          </div>
        </div>

        {audit?.findings && audit.findings.length > 0 ? (
          <div className="space-y-2">
            {audit.findings.slice(0, 4).map((finding) => (
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

        <DataTable
          columns={columns}
          data={audit?.rules ?? []}
          emptyMessage={audit?.error ?? "No firewall rules were reported."}
        />
      </CardContent>
    </Card>
  );
}
