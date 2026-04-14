import pino from "pino";

import { createSharedLoggerOptions } from "@monitor/shared";

import type { ServerEnv } from "./env.js";

export function createLogger(env: ServerEnv) {
  return pino(
    createSharedLoggerOptions({
      name: "monitor-server",
      level: env.LOG_LEVEL
    })
  );
}
