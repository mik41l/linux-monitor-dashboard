import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";

const envSchema = z.object({
  AGENT_ID: z.string().min(1).default("agent-1"),
  AGENT_NAME: z.string().min(1).default("linux-server-1"),
  SERVER_HOST: z.string().min(1).default("server"),
  SERVER_PORT: z.coerce.number().int().positive().default(9000),
  COLLECT_INTERVAL_MS: z.coerce.number().int().positive().default(10000),
  SECURITY_INTERVAL_MS: z.coerce.number().int().positive().default(15000),
  PROC_PATH: z.string().min(1).default("/proc"),
  LOG_PATH: z.string().min(1).default("/var/log"),
  AGENT_CONFIG_PATH: z.string().min(1).default("/app/packages/agent/agent.config.json"),
  TLS_ENABLED: z.coerce.boolean().default(false),
  TLS_CA_PATH: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info")
});

export type AgentEnv = z.infer<typeof envSchema>;

export function readEnv(): AgentEnv {
  const configPath = process.env.AGENT_CONFIG_PATH ?? "/app/packages/agent/agent.config.json";
  const fileConfig = readConfigFile(configPath);

  return envSchema.parse({
    ...fileConfig,
    ...process.env,
    AGENT_CONFIG_PATH: configPath
  });
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
