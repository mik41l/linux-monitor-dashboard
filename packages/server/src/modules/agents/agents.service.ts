import { and, desc, eq, ilike } from "drizzle-orm";

import type {
  AgentHandshake,
  FirewallAudit,
  HardeningReport,
  LoginActivityReport,
  PortScanReport,
  SshdAuditResult
} from "@monitor/shared";

import { agents } from "../../db/schema/agents.schema.js";
import { firewallAudits } from "../../db/schema/firewall-audits.schema.js";
import { hardeningReports } from "../../db/schema/hardening-reports.schema.js";
import { loginActivityReports } from "../../db/schema/login-activity-reports.schema.js";
import { portScans } from "../../db/schema/port-scans.schema.js";
import { sshdAudits } from "../../db/schema/sshd-audits.schema.js";
import type { Database } from "../shared/database.types.js";

export class AgentsService {
  public constructor(private readonly database: Database) {}

  public async upsertHandshake(handshake: AgentHandshake) {
    await this.database.db
      .insert(agents)
      .values({
        agentId: handshake.agentId,
        hostname: handshake.hostname,
        ipAddress: handshake.ipAddress,
        osInfo: handshake.osInfo,
        status: "online",
        lastHeartbeat: new Date()
      })
      .onConflictDoUpdate({
        target: agents.agentId,
        set: {
          hostname: handshake.hostname,
          ipAddress: handshake.ipAddress,
          osInfo: handshake.osInfo,
          status: "online",
          lastHeartbeat: new Date()
        }
      });
  }

  public async touchHeartbeat(agentId: string) {
    await this.database.db
      .update(agents)
      .set({
        status: "online",
        lastHeartbeat: new Date()
      })
      .where(eq(agents.agentId, agentId));
  }

  public async markOffline(agentId: string) {
    await this.database.db
      .update(agents)
      .set({
        status: "offline"
      })
      .where(eq(agents.agentId, agentId));
  }

  public async listAgents(options?: {
    status?: "online" | "offline" | undefined;
    search?: string | undefined;
  }) {
    const conditions = [];

    if (options?.status) {
      conditions.push(eq(agents.status, options.status));
    }

    if (options?.search) {
      conditions.push(ilike(agents.hostname, `%${options.search}%`));
    }

    return this.database.db
      .select()
      .from(agents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(agents.lastHeartbeat));
  }

  public async getAgent(agentId: string) {
    const [agent] = await this.database.db
      .select()
      .from(agents)
      .where(eq(agents.agentId, agentId))
      .limit(1);

    return agent ?? null;
  }

  public async saveSshdAudit(audit: SshdAuditResult) {
    await this.database.db.insert(sshdAudits).values({
      agentId: audit.agentId,
      status: audit.status,
      riskScore: audit.riskScore,
      configPath: audit.configPath,
      payload: audit,
      collectedAt: new Date(audit.collectedAt)
    });
  }

  public async getLatestSshdAudit(agentId: string) {
    const [audit] = await this.database.db
      .select({
        payload: sshdAudits.payload
      })
      .from(sshdAudits)
      .where(eq(sshdAudits.agentId, agentId))
      .orderBy(desc(sshdAudits.collectedAt))
      .limit(1);

    return (audit?.payload as SshdAuditResult | undefined) ?? null;
  }

  public async savePortScan(report: PortScanReport) {
    await this.database.db.insert(portScans).values({
      agentId: report.agentId,
      status: report.status,
      riskScore: report.riskScore,
      payload: report,
      collectedAt: new Date(report.collectedAt)
    });
  }

  public async getLatestPortScan(agentId: string) {
    const [scan] = await this.database.db
      .select({
        payload: portScans.payload
      })
      .from(portScans)
      .where(eq(portScans.agentId, agentId))
      .orderBy(desc(portScans.collectedAt))
      .limit(1);

    return (scan?.payload as PortScanReport | undefined) ?? null;
  }

  public async saveFirewallAudit(audit: FirewallAudit) {
    await this.database.db.insert(firewallAudits).values({
      agentId: audit.agentId,
      status: audit.status,
      riskScore: audit.riskScore,
      payload: audit,
      collectedAt: new Date(audit.collectedAt)
    });
  }

  public async getLatestFirewallAudit(agentId: string) {
    const [audit] = await this.database.db
      .select({
        payload: firewallAudits.payload
      })
      .from(firewallAudits)
      .where(eq(firewallAudits.agentId, agentId))
      .orderBy(desc(firewallAudits.collectedAt))
      .limit(1);

    return (audit?.payload as FirewallAudit | undefined) ?? null;
  }

  public async saveHardeningReport(report: HardeningReport) {
    await this.database.db.insert(hardeningReports).values({
      agentId: report.agentId,
      status: report.status,
      overallScore: report.overallScore,
      payload: report,
      collectedAt: new Date(report.collectedAt)
    });
  }

  public async getLatestHardeningReport(agentId: string) {
    const [report] = await this.database.db
      .select({
        payload: hardeningReports.payload
      })
      .from(hardeningReports)
      .where(eq(hardeningReports.agentId, agentId))
      .orderBy(desc(hardeningReports.collectedAt))
      .limit(1);

    return (report?.payload as HardeningReport | undefined) ?? null;
  }

  public async saveLoginActivity(report: LoginActivityReport) {
    await this.database.db.insert(loginActivityReports).values({
      agentId: report.agentId,
      status: report.status,
      riskScore: report.riskScore,
      payload: report,
      collectedAt: new Date(report.collectedAt)
    });
  }

  public async getLatestLoginActivity(agentId: string) {
    const [report] = await this.database.db
      .select({
        payload: loginActivityReports.payload
      })
      .from(loginActivityReports)
      .where(eq(loginActivityReports.agentId, agentId))
      .orderBy(desc(loginActivityReports.collectedAt))
      .limit(1);

    return (report?.payload as LoginActivityReport | undefined) ?? null;
  }

  public async getAgentSecurityProfile(agentId: string) {
    const agent = await this.getAgent(agentId);

    if (!agent) {
      return null;
    }

    const [sshdAudit, portScan, firewallAudit, hardeningReport, loginActivity] = await Promise.all([
      this.getLatestSshdAudit(agentId),
      this.getLatestPortScan(agentId),
      this.getLatestFirewallAudit(agentId),
      this.getLatestHardeningReport(agentId),
      this.getLatestLoginActivity(agentId)
    ]);

    return {
      agent,
      sshdAudit,
      portScan,
      firewallAudit,
      hardeningReport,
      loginActivity,
      overallStatus: deriveOverallStatus([
        sshdAudit?.status,
        portScan?.status,
        firewallAudit?.status,
        hardeningReport?.status,
        loginActivity?.status
      ]),
      recommendations: collectRecommendations({
        sshdAudit,
        portScan,
        firewallAudit,
        hardeningReport,
        loginActivity
      })
    };
  }

  public async getSecurityOverview() {
    const inventory = await this.listAgents();
    const profiles = (
      await Promise.all(inventory.map((agent) => this.getAgentSecurityProfile(agent.agentId)))
    ).filter((profile): profile is NonNullable<Awaited<ReturnType<AgentsService["getAgentSecurityProfile"]>>> => Boolean(profile));

    const summaries = profiles.map((profile) => ({
      agentId: profile.agent.agentId,
      hostname: profile.agent.hostname,
      status: profile.agent.status,
      lastHeartbeat: profile.agent.lastHeartbeat,
      overallStatus: profile.overallStatus,
      sshdStatus: profile.sshdAudit?.status ?? "unavailable",
      sshdRiskScore: profile.sshdAudit?.riskScore ?? 0,
      portStatus: profile.portScan?.status ?? "unavailable",
      exposedPorts: profile.portScan?.openPorts.filter((port) => port.isExposed).length ?? 0,
      firewallStatus: profile.firewallAudit?.status ?? "unavailable",
      firewallEnabled: profile.firewallAudit?.isEnabled ?? false,
      hardeningStatus: profile.hardeningReport?.status ?? "unavailable",
      hardeningScore: profile.hardeningReport?.overallScore ?? 0,
      loginStatus: profile.loginActivity?.status ?? "unavailable",
      activeSessions: profile.loginActivity?.activeSessions.length ?? 0,
      recommendations: profile.recommendations.slice(0, 3)
    }));

    const totals = {
      agents: summaries.length,
      criticalAgents: summaries.filter((summary) => summary.overallStatus === "critical").length,
      warningAgents: summaries.filter((summary) => summary.overallStatus === "warning").length,
      averageHardeningScore:
        summaries.length > 0
          ? Math.round(
              summaries.reduce((sum, summary) => sum + summary.hardeningScore, 0) / summaries.length
            )
          : 0
    };

    return {
      totals,
      agents: summaries
    };
  }
}

function deriveOverallStatus(statuses: Array<string | null | undefined>) {
  if (statuses.some((status) => status === "critical")) {
    return "critical";
  }

  if (statuses.some((status) => status === "warning")) {
    return "warning";
  }

  if (statuses.some((status) => status === "ok")) {
    return "ok";
  }

  return "unavailable";
}

function collectRecommendations(input: {
  sshdAudit: SshdAuditResult | null;
  portScan: PortScanReport | null;
  firewallAudit: FirewallAudit | null;
  hardeningReport: HardeningReport | null;
  loginActivity: LoginActivityReport | null;
}) {
  const recommendations = new Set<string>();

  for (const finding of input.sshdAudit?.findings ?? []) {
    recommendations.add(finding.recommendation);
  }

  for (const finding of input.firewallAudit?.findings ?? []) {
    recommendations.add(finding.recommendation);
  }

  for (const recommendation of input.hardeningReport?.recommendations ?? []) {
    recommendations.add(recommendation);
  }

  for (const finding of input.loginActivity?.findings ?? []) {
    recommendations.add(finding.recommendation);
  }

  for (const finding of input.portScan?.findings ?? []) {
    recommendations.add(finding);
  }

  return Array.from(recommendations);
}
