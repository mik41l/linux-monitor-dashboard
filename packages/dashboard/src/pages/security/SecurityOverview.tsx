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

const columns: Array<ColumnDef<SecurityOverviewResponse["agents"][number]>> = [
  {
    accessorKey: "hostname",
    header: "Agent",
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-white">{row.original.hostname}</p>
        <p className="text-xs text-slate-500">{row.original.agentId}</p>
      </div>
    )
  },
  {
    accessorKey: "overallStatus",
    header: "Overall",
    cell: ({ row }) => <Badge variant={badgeVariant(row.original.overallStatus)}>{row.original.overallStatus}</Badge>
  },
  {
    accessorKey: "hardeningScore",
    header: "Hardening",
    cell: ({ row }) => `${row.original.hardeningScore}/100`
  },
  {
    accessorKey: "exposedPorts",
    header: "Exposed ports"
  },
  {
    accessorKey: "activeSessions",
    header: "Sessions"
  },
  {
    accessorKey: "agentId",
    header: "Detail",
    cell: ({ row }) => (
      <Link
        className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100"
        to={`/agents/${row.original.agentId}/security`}
      >
        View
      </Link>
    )
  }
];

export function SecurityOverviewPage() {
  const { t } = useLanguage();
  const { data } = useQuery({
    queryKey: ["security-overview"],
    queryFn: () => getJson<SecurityOverviewResponse>("/api/security/overview")
  });
  const totals = data?.data.totals;
  const agents = data?.data.agents ?? [];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          accent="border-cyan-300/30 bg-cyan-300/10 text-cyan-200"
          eyebrow={t("inventory")}
          icon={<Shield className="h-5 w-5" />}
          title="Security-scoped agents"
          value={String(totals?.agents ?? 0)}
        />
        <StatCard
          accent="border-rose-300/30 bg-rose-300/10 text-rose-200"
          eyebrow="Critical"
          icon={<ShieldX className="h-5 w-5" />}
          title="Critical posture"
          value={String(totals?.criticalAgents ?? 0)}
        />
        <StatCard
          accent="border-amber-300/30 bg-amber-300/10 text-amber-200"
          eyebrow="Warning"
          icon={<ShieldAlert className="h-5 w-5" />}
          title="Needs review"
          value={String(totals?.warningAgents ?? 0)}
        />
        <StatCard
          accent="border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
          eyebrow="Baseline"
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Average hardening"
          value={String(totals?.averageHardeningScore ?? 0)}
        />
      </section>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Security overview</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Per-agent posture snapshot</h2>
          </div>

          <DataTable columns={columns} data={agents} emptyMessage="No security snapshots are available yet." />
        </CardContent>
      </Card>
    </div>
  );
}
