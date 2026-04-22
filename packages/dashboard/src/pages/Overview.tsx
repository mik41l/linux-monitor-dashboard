import { useQuery } from "@tanstack/react-query";
import { Activity, BellRing, Server, Shield } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
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
import { translateSeverity } from "../lib/labels.js";

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

type HeartbeatPoint = DashboardSummary["heartbeatSeries"][number];

interface HeartbeatTooltipProps {
  active?: boolean;
  onlineLabel: string;
  label?: string;
  payload?: Array<{
    value?: number;
    payload?: HeartbeatPoint;
  }>;
}

function formatHeartbeatLabel(date: Date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function buildFallbackHeartbeatSeries(onlineAgents: number) {
  const now = new Date();

  return Array.from({ length: 12 }, (_, index) => {
    const pointTime = new Date(now.getTime() - (11 - index) * 5 * 60 * 1000);

    return {
      label: formatHeartbeatLabel(pointTime),
      onlineAgents
    };
  });
}

function HeartbeatTooltip({ active, label, onlineLabel, payload }: HeartbeatTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const value = Number(payload[0]?.value ?? 0);

  return (
    <div className="rounded-2xl border border-cyan-300/20 bg-slate-950/95 px-4 py-3 shadow-2xl shadow-cyan-950/30">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-cyan-100">
        {value} {onlineLabel}
      </p>
    </div>
  );
}

export function OverviewPage() {
  const { language, t } = useLanguage();
  const { data } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => getJson<DashboardSummary>("/api/dashboard/summary")
  });

  const totals = data?.data.totals;
  const onlineAgents = totals?.onlineAgents ?? 0;
  const totalAgents = totals?.agents ?? 0;
  const rawHeartbeatSeries = data?.data.heartbeatSeries ?? [];
  const series = rawHeartbeatSeries.length >= 2 ? rawHeartbeatSeries : buildFallbackHeartbeatSeries(onlineAgents);
  const yAxisMax = Math.max(totalAgents, onlineAgents, ...series.map((point) => point.onlineAgents), 1);
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
            <div className="text-right">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-sm font-medium text-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]" />
                {onlineAgents}/{totalAgents} {t("onlineAgentsLabel")}
              </div>
              <p className="mt-2 text-sm text-slate-400">{t("heartbeatHint")}</p>
            </div>
          </div>

          <div className="h-80 rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.16),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.68),rgba(2,6,23,0.34))] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ bottom: 4, left: 0, right: 18, top: 12 }}>
                <defs>
                  <linearGradient id="heartbeatFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                    <stop offset="55%" stopColor="#22d3ee" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="4 8" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  interval="preserveStartEnd"
                  minTickGap={20}
                  stroke="#94a3b8"
                  tickLine={false}
                  tickMargin={12}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  domain={[0, yAxisMax]}
                  stroke="#94a3b8"
                  tickCount={4}
                  tickLine={false}
                  width={34}
                />
                <ReferenceLine stroke="rgba(148,163,184,0.16)" strokeDasharray="4 8" y={onlineAgents} />
                <Tooltip
                  content={<HeartbeatTooltip onlineLabel={t("onlineAgentsLabel")} />}
                  cursor={{ stroke: "rgba(34,211,238,0.28)", strokeWidth: 1 }}
                />
                <Area
                  activeDot={{ r: 6, fill: "#67e8f9", stroke: "#020617", strokeWidth: 3 }}
                  dataKey="onlineAgents"
                  dot={{ r: 2.5, fill: "#22d3ee", strokeWidth: 0 }}
                  fill="url(#heartbeatFill)"
                  isAnimationActive={false}
                  name={t("onlineAgentsLabel")}
                  stroke="#22d3ee"
                  strokeLinecap="round"
                  strokeWidth={3}
                  type="monotone"
                />
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
                      {translateSeverity(alert.severity, t)}
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
                {t("resourceTrend")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{t("cpuRamUtilization")}</h2>
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
