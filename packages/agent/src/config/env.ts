import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";

const envSchema = z.object({
  AGENT_ID: z.string().trim().optional(),
  AGENT_NAME: z.string().trim().optional(),
  SERVER_HOST: z.string().min(1).default("server"),
  SERVER_PORT: z.coerce.number().int().positive().default(9000),
  COLLECT_INTERVAL_MS: z.coerce.number().int().positive().default(10000),
  SECURITY_INTERVAL_MS: z.coerce.number().int().positive().default(15000),
  SSHD_AUDIT_INTERVAL_MS: z.coerce.number().int().positive().default(60 * 60 * 1000),
  PORT_SCAN_INTERVAL_MS: z.coerce.number().int().positive().default(60 * 1000),
  FIREWALL_INTERVAL_MS: z.coerce.number().int().positive().default(60 * 60 * 1000),
  HARDENING_INTERVAL_MS: z.coerce.number().int().positive().default(60 * 60 * 1000),
  LOGIN_ACTIVITY_INTERVAL_MS: z.coerce.number().int().positive().default(60 * 1000),
  PROC_PATH: z.string().min(1).default("/proc"),
  LOG_PATH: z.string().min(1).default("/var/log"),
  SSHD_CONFIG_PATH: z.string().min(1).default("/etc/ssh/sshd_config"),
  W_SNAPSHOT_PATH: z.string().min(1).optional(),
  LAST_SNAPSHOT_PATH: z.string().min(1).optional(),
  LASTB_SNAPSHOT_PATH: z.string().min(1).optional(),
  AGENT_CONFIG_PATH: z.string().min(1).default("/app/packages/agent/agent.config.json"),
  TLS_ENABLED: z.coerce.boolean().default(false),
  TLS_CA_PATH: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info")
});

type RawAgentEnv = z.infer<typeof envSchema>;
export type AgentEnv = Omit<RawAgentEnv, "AGENT_ID" | "AGENT_NAME"> & {
  AGENT_ID: string;
  AGENT_NAME: string;
};

export function readEnv(): AgentEnv {
  const configPath = process.env.AGENT_CONFIG_PATH ?? "/app/packages/agent/agent.config.json";
  const fileConfig = readConfigFile(configPath);
  const parsed = envSchema.parse({
    ...fileConfig,
    ...process.env,
    AGENT_CONFIG_PATH: configPath
  });
  const hostname = process.env.HOSTNAME?.trim() || "linux-agent";

  return {
    ...parsed,
    AGENT_ID: parsed.AGENT_ID && parsed.AGENT_ID.length > 0 ? parsed.AGENT_ID : hostname,
    AGENT_NAME:
      parsed.AGENT_NAME && parsed.AGENT_NAME.length > 0 ? parsed.AGENT_NAME : hostname
  };
}

function readConfigFile(configPath: string) {
  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const raw = readFileSync(configPath, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}
