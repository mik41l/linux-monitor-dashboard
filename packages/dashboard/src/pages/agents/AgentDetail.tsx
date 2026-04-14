import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

import { getJson } from "../../api/client.js";
import { DataTable } from "../../components/data-table/DataTable.js";
import { Card, CardContent } from "../../components/ui/card.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { formatBytes, formatDuration, formatTimestamp } from "../../lib/format.js";
import { AgentStatusBadge } from "./components/AgentStatusBadge.js";
import { CpuGauge } from "./components/CpuGauge.js";
import { MemoryGauge } from "./components/MemoryGauge.js";
import { MetricChart } from "./components/MetricChart.js";
import { SeverityBadge } from "../events/components/SeverityBadge.js";
import type { AgentInfo } from "@monitor/shared";

interface MetricRecord {
  id: number;
  agentId: string;
  metricType: string;
  value: Record<string, unknown>;
  collectedAt: string;
}

interface EventRecord {
  id: number;
  eventType: string;
  severity: string;
  source: string | null;
  message: string | null;
  occurredAt: string;
}

export function AgentDetailPage() {
  const { language, t } = useLanguage();
  const { agentId = "" } = useParams();
  const { data } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => getJson<AgentInfo>(`/api/agents/${agentId}`)
  });
  const { data: cpuMetrics } = useQuery({
    queryKey: ["agent-metrics", agentId, "cpu"],
    queryFn: () => getJson<MetricRecord[]>(`/api/agents/${agentId}/metrics?type=cpu&range=1h&limit=30`)
  });
  const { data: memoryMetrics } = useQuery({
    queryKey: ["agent-metrics", agentId, "memory"],
    queryFn: () =>
      getJson<MetricRecord[]>(`/api/agents/${agentId}/metrics?type=memory&range=1h&limit=30`)
  });
  const { data: diskMetrics } = useQuery({
    queryKey: ["agent-metrics", agentId, "disk"],
    queryFn: () =>
      getJson<MetricRecord[]>(`/api/agents/${agentId}/metrics?type=disk&range=1h&limit=10`)
  });
  const { data: networkMetrics } = useQuery({
    queryKey: ["agent-metrics", agentId, "network"],
    queryFn: () =>
      getJson<MetricRecord[]>(`/api/agents/${agentId}/metrics?type=network&range=1h&limit=10`)
  });
  const { data: eventsData } = useQuery({
    queryKey: ["agent-events", agentId],
    queryFn: () => getJson<EventRecord[]>("/api/events", { agentId, limit: 10 })
  });

  const agent = data?.data;

  if (!agent) {
    return (
      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-slate-300">
        Agent details are not available yet.
      </div>
    );
  }

  const latestCpu = cpuMetrics?.data[0]?.value ?? {};
  const latestMemory = memoryMetrics?.data[0]?.value ?? {};
  const latestDisk = Array.isArray(diskMetrics?.data[0]?.value) ? diskMetrics?.data[0]?.value[0] : null;
  const latestNetwork = Array.isArray(networkMetrics?.data[0]?.value)
    ? networkMetrics?.data[0]?.value[0]
    : null;
  const cpuPercent =
    typeof latestCpu?.usagePercent === "number" ? `${latestCpu.usagePercent.toFixed(1)}%` : "n/a";
  const memoryPercent =
    typeof latestMemory?.usagePercent === "number"
      ? `${latestMemory.usagePercent.toFixed(1)}%`
      : "n/a";
  const memoryUsed =
    typeof latestMemory?.usedBytes === "number" ? formatBytes(latestMemory.usedBytes) : "n/a";

  const cpuChartData = (cpuMetrics?.data ?? [])
    .map((entry) => ({
      label: formatTimestamp(entry.collectedAt, language),
      value: Number(entry.value.usagePercent ?? 0)
    }))
    .reverse();
  const memoryChartData = (memoryMetrics?.data ?? [])
    .map((entry) => ({
      label: formatTimestamp(entry.collectedAt, language),
      value: Number(entry.value.usagePercent ?? 0)
    }))
    .reverse();
  const eventColumns = useMemo<Array<ColumnDef<EventRecord>>>(
    () => [
      {
        accessorKey: "eventType",
        header: t("event")
      },
      {
        accessorKey: "severity",
        header: t("severity"),
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} />
      },
      {
        accessorKey: "message",
        header: t("message"),
        cell: ({ row }) => row.original.message ?? row.original.source ?? "n/a"
      },
      {
        accessorKey: "occurredAt",
        header: t("at"),
        cell: ({ row }) => formatTimestamp(row.original.occurredAt, language)
      }
    ],
    [language, t]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">
              {t("agentDetail")}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">{agent.hostname}</h2>
            <p className="mt-3 text-sm text-slate-400">{agent.agentId}</p>
          </div>
          <AgentStatusBadge status={agent.status} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CpuGauge value={Number(latestCpu.usagePercent ?? 0)} />
        <MemoryGauge value={Number(latestMemory.usagePercent ?? 0)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <MetricChart color="#22d3ee" data={cpuChartData} title={t("cpuHistory")} />
        <MetricChart color="#f59e0b" data={memoryChartData} title="Memory history" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("recentMetricSamples")}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-400">Disk</p>
                <p className="mt-2 text-lg font-medium text-white">
                  {latestDisk ? `${Number(latestDisk.usagePercent ?? 0).toFixed(1)}%` : "n/a"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {latestDisk?.mountPoint ?? "n/a"}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-400">Network</p>
                <p className="mt-2 text-lg font-medium text-white">
                  {latestNetwork
                    ? `${formatBytes(Number(latestNetwork.rxBytes ?? 0))} / ${formatBytes(
                        Number(latestNetwork.txBytes ?? 0)
                      )}`
                    : "n/a"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {latestNetwork?.interfaceName ?? "n/a"}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-400">Memory footprint</p>
                <p className="mt-2 text-lg font-medium text-white">{memoryUsed}</p>
                <p className="mt-2 text-sm text-slate-500">{memoryPercent}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-400">Telemetry</p>
                <p className="mt-2 text-lg font-medium text-white">
                  {agent.lastHeartbeat ? formatTimestamp(agent.lastHeartbeat, language) : t("noHeartbeat")}
                </p>
                <p className="mt-2 text-sm text-slate-500">{cpuPercent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Agent info</p>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <p className="text-slate-400">Hostname</p>
              <p className="mt-1 text-white">{agent.hostname}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <p className="text-slate-400">OS / Kernel</p>
              <p className="mt-1 text-white">
                {agent.osInfo?.platform ?? "unknown"} • {agent.osInfo?.kernelVersion ?? "unknown"}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <p className="text-slate-400">IP address</p>
              <p className="mt-1 text-white">{agent.ipAddress ?? "n/a"}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <p className="text-slate-400">Registered</p>
              <p className="mt-1 text-white">{formatTimestamp(agent.registeredAt, language)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <p className="text-slate-400">Uptime</p>
              <p className="mt-1 text-white">
                {formatDuration(agent.osInfo?.uptimeSeconds)}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="p-6">
          <p className="mb-4 text-xs uppercase tracking-[0.28em] text-slate-400">
            Recent security events
          </p>
          <DataTable
            columns={eventColumns}
            data={eventsData?.data ?? []}
            emptyMessage={t("noEvents")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
