import type { ColumnDef } from "@tanstack/react-table";

import type { FirewallAudit, FirewallRule } from "@monitor/shared";

import { DataTable } from "../../../components/data-table/DataTable.js";
import { Badge } from "../../../components/ui/badge.js";
import { Card, CardContent } from "../../../components/ui/card.js";
import { useLanguage } from "../../../context/LanguageContext.js";
import { translateAuditStatus } from "../../../lib/labels.js";

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
  const { t } = useLanguage();
  const hasRules = (audit?.rules?.length ?? 0) > 0;
  const columns: Array<ColumnDef<FirewallRule>> = [
    { accessorKey: "chain", header: t("chain") },
    { accessorKey: "target", header: t("target") },
    { accessorKey: "protocol", header: t("proto") },
    { accessorKey: "source", header: t("source") },
    { accessorKey: "destination", header: t("destination") },
    {
      accessorKey: "port",
      header: t("port"),
      cell: ({ row }) => row.original.port ?? "n/a"
    }
  ];

  return (
    <Card className="h-fit">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("firewallTitle")}</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{t("policyCoverage")}</h3>
          </div>
          <Badge variant={getVariant(audit?.status)}>
            {translateAuditStatus(audit?.status ?? "unavailable", t)} · {audit?.riskScore ?? 0}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-sm text-slate-400">{t("backendLabel")}</p>
            <p className="mt-2 text-sm text-white">{audit?.backend ?? t("backendNone")}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-sm text-slate-400">{t("inputPolicy")}</p>
            <p className="mt-2 text-sm text-white">{audit?.defaultPolicy.input ?? t("unknown")}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-sm text-slate-400">{t("outputPolicy")}</p>
            <p className="mt-2 text-sm text-white">{audit?.defaultPolicy.output ?? t("unknown")}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-sm text-slate-400">{t("forwardPolicy")}</p>
            <p className="mt-2 text-sm text-white">{audit?.defaultPolicy.forward ?? t("unknown")}</p>
          </div>
        </div>

        {audit?.findings && audit.findings.length > 0 ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {audit.findings.slice(0, 4).map((finding) => (
              <div key={`${finding.key}-${finding.message}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
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

        {hasRules ? (
          <DataTable
            columns={columns}
            data={audit?.rules ?? []}
            emptyMessage={audit?.error ?? t("noFirewallRules")}
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-400">
            {audit?.error ?? t("noFirewallRulesForAgent")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
