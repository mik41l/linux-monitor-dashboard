import { readEnv } from "./config/env.js";
import { createLogger } from "./config/logger.js";
import { AgentRuntime } from "./runtime/agent-runtime.js";
import { registerSignalHandlers } from "./signals/handler.js";
import { TcpClient } from "./transport/tcp-client.js";

async function bootstrap() {
  const env = readEnv();
  const logger = createLogger(env);
  const client = new TcpClient(
    {
      agentId: env.AGENT_ID,
      agentName: env.AGENT_NAME,
      collectIntervalMs: env.COLLECT_INTERVAL_MS,
      serverHost: env.SERVER_HOST,
      serverPort: env.SERVER_PORT,
      tlsEnabled: env.TLS_ENABLED,
      ...(env.TLS_CA_PATH ? { tlsCaPath: env.TLS_CA_PATH } : {})
    },
    logger
  );
  const runtime = new AgentRuntime(env, logger, client);

  let shuttingDown = false;

  const shutdown = async () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    await runtime.stop();
    logger.info("Agent shutdown complete");
    process.exit(0);
  };

  registerSignalHandlers(logger, {
    forceCollect: () => runtime.forceCollect(),
    dumpState: () => runtime.dumpState(),
    reloadConfig: () => runtime.reloadConfig(),
    shutdown
  });

  logger.info("Starting monitor agent");
  runtime.start();
}

void bootstrap();
