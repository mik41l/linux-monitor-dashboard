import type { AgentHandshake, AgentInfo } from "@monitor/shared";

export interface AgentConnectionState extends AgentInfo {
  version: string;
}

export class ConnectionManager {
  private readonly agents = new Map<string, AgentConnectionState>();

  public registerHandshake(handshake: AgentHandshake) {
    const existing = this.agents.get(handshake.agentId);
    const now = new Date().toISOString();

    const agent: AgentConnectionState = {
      agentId: handshake.agentId,
      hostname: handshake.hostname,
      osInfo: handshake.osInfo,
      status: "online",
      lastHeartbeat: now,
      registeredAt: existing?.registeredAt ?? now,
      version: handshake.version,
      ...(handshake.ipAddress ? { ipAddress: handshake.ipAddress } : {})
    };

    this.agents.set(handshake.agentId, agent);
    return agent;
  }

  public markHeartbeat(agentId: string) {
    const agent = this.agents.get(agentId);

    if (!agent) {
      return null;
    }

    agent.status = "online";
    agent.lastHeartbeat = new Date().toISOString();
    this.agents.set(agentId, agent);

    return agent;
  }

  public markOffline(agentId: string) {
    const agent = this.agents.get(agentId);

    if (!agent) {
      return;
    }

    agent.status = "offline";
    this.agents.set(agentId, agent);
  }

  public listAgents() {
    return [...this.agents.values()].sort((left, right) =>
      left.hostname.localeCompare(right.hostname)
    );
  }

  public getAgent(agentId: string) {
    return this.agents.get(agentId) ?? null;
  }

  public getDashboardSummary() {
    const agents = this.listAgents();
    const onlineAgents = agents.filter((agent) => agent.status === "online").length;

    return {
      totals: {
        agents: agents.length,
        onlineAgents,
        offlineAgents: agents.length - onlineAgents,
        openAlerts: 0,
        securityEvents24h: 0
      },
      heartbeatSeries: Array.from({ length: 6 }, (_, index) => ({
        label: `T-${5 - index}`,
        onlineAgents
      })),
      recentAgents: agents.slice(0, 5)
    };
  }
}
