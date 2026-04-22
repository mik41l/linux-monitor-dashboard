import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import type {
  AgentInfo,
  FirewallAudit,
  HardeningReport,
  LoginActivityReport,
  PortScanReport,
  SshdAuditResult
} from "@monitor/shared";

import { getJson } from "../../api/client.js";
import { Badge } from "../../components/ui/badge.js";
import { Card, CardContent } from "../../components/ui/card.js";
import { useLanguage } from "../../context/LanguageContext.js";
import { translateAgentStatus, translateAuditStatus } from "../../lib/labels.js";
import { RecommendationList } from "./components/RecommendationList.js";
import { SshdAuditCard } from "./components/SshdAuditCard.js";
import { PortsTable } from "./components/PortsTable.js";
import { FirewallStatus } from "./components/FirewallStatus.js";
import { HardeningGauge } from "./components/HardeningGauge.js";
import { ActiveSessions } from "./components/ActiveSessions.js";

interface AgentSecurityProfile {
  agent: AgentInfo;
  sshdAudit: SshdAuditResult | null;
  portScan: PortScanReport | null;
  firewallAudit: FirewallAudit | null;
  hardeningReport: HardeningReport | null;
  loginActivity: LoginActivityReport | null;
  overallStatus: "ok" | "warning" | "critical" | "unavailable";
  recommendations: string[];
}

function badgeVariant(status: AgentSecurityProfile["overallStatus"] | AgentInfo["status"]) {
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

export function AgentSecurityDetailPage() {
  const { t } = useLanguage();
  const { agentId = "" } = useParams();
  const { data } = useQuery({
    queryKey: ["agent-security", agentId],
    queryFn: () => getJson<AgentSecurityProfile>(`/api/agents/${agentId}/security`)
  });
  const profile = data?.data;

  if (!profile) {
    return (
      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-slate-300">
        {t("securityDetailsUnavailable")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">{t("agentSecurityDetail")}</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">{profile.agent.hostname}</h2>
            <p className="mt-3 text-sm text-slate-400">{profile.agent.agentId}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={badgeVariant(profile.agent.status)}>
              {translateAgentStatus(profile.agent.status, t)}
            </Badge>
            <Badge variant={badgeVariant(profile.overallStatus)}>
              {translateAuditStatus(profile.overallStatus, t)}
            </Badge>
            <Link
              className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-200"
              to={`/agents/${profile.agent.agentId}`}
            >
              {t("backToTelemetry")}
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("sshdRisk")}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{profile.sshdAudit?.riskScore ?? 0}</p>
            <p className="mt-2 text-sm text-slate-400">
              {translateAuditStatus(profile.sshdAudit?.status ?? "unavailable", t)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("exposedPortsLabel")}</p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {profile.portScan?.openPorts.filter((port) => port.isExposed).length ?? 0}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {translateAuditStatus(profile.portScan?.status ?? "unavailable", t)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("loginFindings")}</p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {profile.loginActivity?.findings.length ?? 0}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {translateAuditStatus(profile.loginActivity?.status ?? "unavailable", t)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("recommendationsLabel")}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{profile.recommendations.length}</p>
            <p className="mt-2 text-sm text-slate-400">{t("remediationQueue")}</p>
          </CardContent>
        </Card>
      </section>

      <HardeningGauge report={profile.hardeningReport} />

      <section className="grid items-start gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
        <SshdAuditCard audit={profile.sshdAudit} />
        <FirewallStatus audit={profile.firewallAudit} />
      </section>

      <section className="space-y-6">
        <PortsTable report={profile.portScan} />
        <ActiveSessions report={profile.loginActivity} />
      </section>

      <RecommendationList recommendations={profile.recommendations} />
    </div>
  );
}
