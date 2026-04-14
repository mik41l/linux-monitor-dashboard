import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";

import { getJson } from "../../api/client.js";
import { DataTable } from "../../components/data-table/DataTable.js";
import { Badge } from "../../components/ui/badge.js";
import { Card, CardContent } from "../../components/ui/card.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { formatBytes, formatDuration, formatTimestamp } from "../../lib/format.js";
import { translateAuditStatus, translateRiskLevel } from "../../lib/labels.js";
import { AgentStatusBadge } from "./components/AgentStatusBadge.js";
import { CpuGauge } from "./components/CpuGauge.js";
import { MemoryGauge } from "./components/MemoryGauge.js";
import { MetricChart } from "./components/MetricChart.js";
import { SeverityBadge } from "../events/components/SeverityBadge.js";
import type { AgentInfo, OpenPort, PortScanReport, SshdAuditResult } from "@monitor/shared";

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
  const { data: sshdAuditData } = useQuery({
    queryKey: ["agent-sshd-audit", agentId],
    queryFn: () => getJson<SshdAuditResult | null>(`/api/agents/${agentId}/sshd-audit`)
  });
  const { data: portScanData } = useQuery({
    queryKey: ["agent-port-scan", agentId],
    queryFn: () => getJson<PortScanReport | null>(`/api/agents/${agentId}/open-ports`)
  });

  const agent = data?.data;

  if (!agent) {
    return (
      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-slate-300">
        {t("agentDetailsUnavailable")}
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
  const eventColumns: Array<ColumnDef<EventRecord>> = [
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
  ];
  const sshdAudit = sshdAuditData?.data ?? null;
  const portScan = portScanData?.data ?? null;
  const sshdStatusVariant =
    sshdAudit?.status === "critical"
      ? "destructive"
      : sshdAudit?.status === "warning"
        ? "warning"
        : sshdAudit?.status === "ok"
          ? "success"
          : "muted";
  const portScanColumns: Array<ColumnDef<OpenPort>> = [
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
          <div className="flex items-center gap-3">
            <AgentStatusBadge status={agent.status} />
            <Link
              className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-200"
              to={`/agents/${agent.agentId}/security`}
            >
              {t("securityDetailLink")}
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CpuGauge value={Number(latestCpu.usagePercent ?? 0)} />
        <MemoryGauge value={Number(latestMemory.usagePercent ?? 0)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <MetricChart color="#22d3ee" data={cpuChartData} title={t("cpuHistory")} />
        <MetricChart color="#f59e0b" data={memoryChartData} title={t("memoryHistory")} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("recentMetricSamples")}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-400">{t("diskLabel")}</p>
                <p className="mt-2 text-lg font-medium text-white">
                  {latestDisk ? `${Number(latestDisk.usagePercent ?? 0).toFixed(1)}%` : "n/a"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {latestDisk?.mountPoint ?? "n/a"}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-400">{t("networkLabel")}</p>
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
                <p className="text-sm text-slate-400">{t("memoryFootprint")}</p>
                <p className="mt-2 text-lg font-medium text-white">{memoryUsed}</p>
                <p className="mt-2 text-sm text-slate-500">{memoryPercent}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-400">{t("telemetry")}</p>
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
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("agentInfo")}</p>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <p className="text-slate-400">{t("hostname")}</p>
              <p className="mt-1 text-white">{agent.hostname}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <p className="text-slate-400">{t("osKernel")}</p>
              <p className="mt-1 text-white">
                {agent.osInfo?.platform ?? t("unknown")} • {agent.osInfo?.kernelVersion ?? t("unknown")}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <p className="text-slate-400">{t("ipAddress")}</p>
              <p className="mt-1 text-white">{agent.ipAddress ?? "n/a"}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <p className="text-slate-400">{t("registered")}</p>
              <p className="mt-1 text-white">{formatTimestamp(agent.registeredAt, language)}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
              <p className="text-slate-400">{t("uptime")}</p>
              <p className="mt-1 text-white">
                {formatDuration(agent.osInfo?.uptimeSeconds)}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("sshdAudit")}</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{t("sshConfigurationPosture")}</h3>
            </div>
            <Badge variant={sshdStatusVariant}>
              {translateAuditStatus(sshdAudit?.status ?? "unavailable", t)} · {sshdAudit?.riskScore ?? 0}
            </Badge>
          </div>

          {!sshdAudit ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
              {t("noSshdAuditYet")}
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-slate-400">{t("configPath")}</p>
                  <p className="mt-2 text-sm text-white">{sshdAudit.configPath}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-slate-400">{t("collected")}</p>
                  <p className="mt-2 text-sm text-white">
                    {formatTimestamp(sshdAudit.collectedAt, language)}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-slate-400">{t("permitRootLogin")}</p>
                  <p className="mt-2 text-sm text-white">{sshdAudit.permitRootLogin ?? t("notSet")}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-slate-400">{t("passwordAuthentication")}</p>
                  <p className="mt-2 text-sm text-white">
                    {sshdAudit.passwordAuthentication ?? t("notSet")}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-slate-400">{t("portMaxAuthTries")}</p>
                  <p className="mt-2 text-sm text-white">
                    {sshdAudit.port ?? t("notSet")} / {sshdAudit.maxAuthTries ?? t("notSet")}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm text-slate-400">{t("allowUsers")}</p>
                  <p className="mt-2 text-sm text-white">
                    {sshdAudit.allowUsers.length > 0 ? sshdAudit.allowUsers.join(", ") : t("notSet")}
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-400">{t("findings")}</p>
                {sshdAudit.error ? (
                  <p className="text-sm text-amber-200">{sshdAudit.error}</p>
                ) : sshdAudit.findings.length === 0 ? (
                  <p className="text-sm text-emerald-200">{t("noRiskySshdSettings")}</p>
                ) : (
                  sshdAudit.findings.map((finding) => (
                    <div
                      key={`${finding.key}-${finding.message}`}
                      className="rounded-2xl border border-white/10 bg-slate-950/40 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
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
                      <p className="mt-2 text-xs text-slate-500">{finding.recommendation}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{t("openPortsTitle")}</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{t("listeningSocketExposure")}</h3>
            </div>
            <Badge
              variant={
                portScan?.status === "critical"
                  ? "destructive"
                  : portScan?.status === "warning"
                    ? "warning"
                    : portScan?.status === "ok"
                      ? "success"
                      : "muted"
              }
            >
              {translateAuditStatus(portScan?.status ?? "unavailable", t)} · {portScan?.riskScore ?? 0}
            </Badge>
          </div>
          {!portScan ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
              {t("noPortScanYet")}
            </div>
          ) : (
            <>
              {portScan.error ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-amber-200">
                  {portScan.error}
                </div>
              ) : null}
              {portScan.findings.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {portScan.findings.map((finding) => (
                    <Badge key={finding} variant="warning">
                      {finding}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <DataTable
                columns={portScanColumns}
                data={portScan.openPorts}
                emptyMessage={t("noOpenPortsReported")}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <p className="mb-4 text-xs uppercase tracking-[0.28em] text-slate-400">
            {t("recentSecurityEvents")}
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
