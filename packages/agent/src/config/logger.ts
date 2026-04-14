import pino from "pino";

import { createSharedLoggerOptions } from "@monitor/shared";

import type { AgentEnv } from "./env.js";

export function createLogger(env: AgentEnv) {
  return pino(
    createSharedLoggerOptions({
      name: "monitor-agent",
      level: env.LOG_LEVEL,
      base: {
        agentId: env.AGENT_ID,
        hostname: env.AGENT_NAME
      }
    })
  );
}
