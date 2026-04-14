import { useQuery } from "@tanstack/react-query";
import { Activity, BellRing, Server, Shield } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { getJson } from "../api/client.js";
import { StatCard } from "../components/StatCard.js";
import { Badge } from "../components/ui/badge.js";
import { Card, CardContent } from "../components/ui/card.js";
import { useLanguage } from "../context/LanguageContext.js";
import { formatTimestamp } from "../lib/format.js";

interface DashboardSummary {
  totals: {
    agents: number;
    onlineAgents: number;
    offlineAgents: number;
    openAlerts: number;
    securityEvents24h: number;
  };
  heartbeatSeries: Array<{
    label: string;
    onlineAgents: number;
  }>;
  resourceSeries: Array<{
    label: string;
    cpu: number;
    memory: number;
  }>;
  recentAlerts: Array<{
    id: number;
    ruleName: string;
    severity: string;
    message: string;
    createdAt: string;
    status: string;
  }>;
}

export function OverviewPage() {
  const { language, t } = useLanguage();
  const { data } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => getJson<DashboardSummary>("/api/dashboard/summary")
  });

  const totals = data?.data.totals;
  const series = data?.data.heartbeatSeries ?? [];
  const resourceSeries = data?.data.resourceSeries ?? [];
  const recentAlerts = data?.data.recentAlerts ?? [];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          accent="border-cyan-300/30 bg-cyan-300/10 text-cyan-200"
          eyebrow={t("inventory")}
          icon={<Server className="h-5 w-5" />}
          title={t("registeredAgents")}
          value={String(totals?.agents ?? 0)}
        />
        <StatCard
          accent="border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
          eyebrow={t("availability")}
          icon={<Activity className="h-5 w-5" />}
          title={t("onlineNodes")}
          value={String(totals?.onlineAgents ?? 0)}
        />
        <StatCard
          accent="border-amber-300/30 bg-amber-300/10 text-amber-200"
          eyebrow={t("detection")}
          icon={<Shield className="h-5 w-5" />}
          title={t("securityEvents24h")}
          value={String(totals?.securityEvents24h ?? 0)}
        />
        <StatCard
          accent="border-rose-300/30 bg-rose-300/10 text-rose-200"
          eyebrow={t("alerts")}
          icon={<BellRing className="h-5 w-5" />}
          title={t("openAlerts")}
          value={String(totals?.openAlerts ?? 0)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <Card className="p-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">
                {t("livePosture")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {t("heartbeatTrend")}
              </h2>
            </div>
            <p className="text-sm text-slate-400">
              {t("heartbeatHint")}
            </p>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="heartbeatFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "18px"
                  }}
                />
                <Area dataKey="onlineAgents" stroke="#22d3ee" strokeWidth={2} fill="url(#heartbeatFill)" type="monotone" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("recentAlerts")}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{t("detectionQueue")}</h2>
          <div className="mt-6 space-y-3">
            {recentAlerts.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-slate-950/40 px-4 py-5 text-sm text-slate-400">
                {t("noAlerts")}
              </div>
            ) : (
              recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-3xl border border-white/10 bg-slate-950/40 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">{alert.ruleName}</p>
                      <p className="mt-1 text-sm text-slate-400">{alert.message}</p>
                    </div>
                    <Badge
                      variant={
                        alert.severity === "critical"
                          ? "destructive"
                          : alert.severity === "warning"
                            ? "warning"
                            : "muted"
                      }
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {formatTimestamp(alert.createdAt, language)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <Card>
        <CardContent className="p-6">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">
                Resource trend
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">CPU / RAM utilization</h2>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={resourceSeries}>
                <defs>
                  <linearGradient id="cpuFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="memoryFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#020617",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "18px"
                  }}
                />
                <Area dataKey="cpu" stroke="#22d3ee" fill="url(#cpuFill)" type="monotone" />
                <Area dataKey="memory" stroke="#f59e0b" fill="url(#memoryFill)" type="monotone" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
