import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { Link } from "react-router-dom";

import { getJson } from "../../api/client.js";
import { StatCard } from "../../components/StatCard.js";
import { DataTable } from "../../components/data-table/DataTable.js";
import { Badge } from "../../components/ui/badge.js";
import { Card, CardContent } from "../../components/ui/card.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { translateAuditStatus } from "../../lib/labels.js";

interface SecurityOverviewResponse {
  totals: {
    agents: number;
    criticalAgents: number;
    warningAgents: number;
    averageHardeningScore: number;
  };
  agents: Array<{
    agentId: string;
    hostname: string;
    status: string;
    lastHeartbeat: string | null;
    overallStatus: string;
    sshdStatus: string;
    sshdRiskScore: number;
    portStatus: string;
    exposedPorts: number;
    firewallStatus: string;
    firewallEnabled: boolean;
    hardeningStatus: string;
    hardeningScore: number;
    loginStatus: string;
    activeSessions: number;
    recommendations: string[];
  }>;
}

function badgeVariant(status: string) {
  if (status === "critical") {
    return "destructive";
  }

  if (status === "warning") {
    return "warning";
  }

  if (status === "ok" || status === "online") {
    return "success";
  }

  return "muted";
}

export function SecurityOverviewPage() {
  const { t } = useLanguage();
  const { data } = useQuery({
    queryKey: ["security-overview"],
    queryFn: () => getJson<SecurityOverviewResponse>("/api/security/overview")
  });
  const totals = data?.data.totals;
  const agents = data?.data.agents ?? [];
  const columns = useMemo<Array<ColumnDef<SecurityOverviewResponse["agents"][number]>>>(
    () => [
      {
        accessorKey: "hostname",
        header: t("agent"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-white">{row.original.hostname}</p>
            <p className="text-xs text-slate-500">{row.original.agentId}</p>
          </div>
        )
      },
      {
        accessorKey: "overallStatus",
        header: t("overall"),
        cell: ({ row }) => (
          <Badge variant={badgeVariant(row.original.overallStatus)}>
            {translateAuditStatus(row.original.overallStatus, t)}
          </Badge>
        )
      },
      {
        accessorKey: "hardeningScore",
        header: t("hardening"),
        cell: ({ row }) => `${row.original.hardeningScore}/100`
      },
      {
        accessorKey: "exposedPorts",
        header: t("exposedPortsLabel")
      },
      {
        accessorKey: "activeSessions",
        header: t("sessions")
      },
      {
        accessorKey: "agentId",
        header: t("detail"),
        cell: ({ row }) => (
          <Link
            className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100"
            to={`/agents/${row.original.agentId}/security`}
          >
            {t("view")}
          </Link>
        )
      }
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          accent="border-cyan-300/30 bg-cyan-300/10 text-cyan-200"
          eyebrow={t("inventory")}
          icon={<Shield className="h-5 w-5" />}
          title={t("securityScopedAgents")}
          value={String(totals?.agents ?? 0)}
        />
        <StatCard
          accent="border-rose-300/30 bg-rose-300/10 text-rose-200"
          eyebrow={t("criticalSeverity")}
          icon={<ShieldX className="h-5 w-5" />}
          title={t("criticalPosture")}
          value={String(totals?.criticalAgents ?? 0)}
        />
        <StatCard
          accent="border-amber-300/30 bg-amber-300/10 text-amber-200"
          eyebrow={t("warningSeverity")}
          icon={<ShieldAlert className="h-5 w-5" />}
          title={t("needsReview")}
          value={String(totals?.warningAgents ?? 0)}
        />
        <StatCard
          accent="border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
          eyebrow={t("hardening")}
          icon={<ShieldCheck className="h-5 w-5" />}
          title={t("averageHardening")}
          value={String(totals?.averageHardeningScore ?? 0)}
        />
      </section>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("securityOverviewEyebrow")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{t("securityOverviewTitle")}</h2>
          </div>

          <DataTable columns={columns} data={agents} emptyMessage={t("noSecuritySnapshots")} />
        </CardContent>
      </Card>
    </div>
  );
}
