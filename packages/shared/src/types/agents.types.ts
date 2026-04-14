export interface AgentOsInfo {
  platform: string;
  distro?: string;
  kernelVersion: string;
  architecture: string;
  uptimeSeconds?: number;
}

export type AgentStatus = "online" | "offline";

export interface AgentInfo {
  agentId: string;
  hostname: string;
  ipAddress?: string;
  osInfo?: AgentOsInfo;
  status: AgentStatus;
  lastHeartbeat?: string;
  registeredAt: string;
}

export interface AgentHandshake {
  agentId: string;
  hostname: string;
  ipAddress?: string;
  osInfo: AgentOsInfo;
  version: string;
}

export interface AgentConfig {
  agentId: string;
  agentName: string;
  serverHost: string;
  serverPort: number;
  collectIntervalMs: number;
  securityIntervalMs: number;
  procPath: string;
  logPath: string;
  tlsEnabled: boolean;
}
