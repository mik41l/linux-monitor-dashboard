import { z } from "zod";

const envSchema = z.object({
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(5005),
  TCP_HOST: z.string().min(1).default("0.0.0.0"),
  TCP_PORT: z.coerce.number().int().positive().default(9000),
  TLS_ENABLED: z.coerce.boolean().default(false),
  TLS_CERT_PATH: z.string().min(1).optional(),
  TLS_KEY_PATH: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  DATABASE_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(16).default("dev-monitor-auth-secret-change-me"),
  DEFAULT_ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  DEFAULT_ADMIN_USERNAME: z.string().min(1).default("admin"),
  DEFAULT_ADMIN_NAME: z.string().min(1).default("System Administrator"),
  DEFAULT_ADMIN_PASSWORD: z.string().min(8).default("Admin12345!"),
  AGENT_BUNDLE_PATH: z.string().min(1).default("/app/agent-bundle")
});

export type ServerEnv = z.infer<typeof envSchema>;

export function readEnv(): ServerEnv {
  return envSchema.parse(process.env);
}
