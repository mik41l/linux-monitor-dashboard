import { buildApp } from "./app.js";
import { CorrelationEngine } from "./correlation/engine.js";
import { createDatabase } from "./config/database.js";
import { readEnv } from "./config/env.js";
import { createLogger } from "./config/logger.js";
import { ensureDatabase } from "./db/init.js";
import { AgentsService } from "./modules/agents/agents.service.js";
import { AgentInstallsService } from "./modules/agent-installs/agent-installs.service.js";
import { AlertsService } from "./modules/alerts/alerts.service.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { DashboardService } from "./modules/dashboard/dashboard.service.js";
import { EventsService } from "./modules/events/events.service.js";
import { MetricsService } from "./modules/metrics/metrics.service.js";
import { ConnectionManager } from "./receiver/connection-manager.js";
import { createTcpServer } from "./receiver/tcp-server.js";
import { WebSocketHub } from "./websocket/ws-hub.js";

async function bootstrap() {
  const env = readEnv();
  const logger = createLogger(env);
  const database = createDatabase(env.DATABASE_URL ?? "postgresql://monitor:monitor_secret@postgres:5432/monitor");
  await ensureDatabase(database.pool);
  const connections = new ConnectionManager();
  const agentsService = new AgentsService(database);
  const agentInstallsService = new AgentInstallsService(database);
  const metricsService = new MetricsService(database);
  const eventsService = new EventsService(database);
  const alertsService = new AlertsService(database);
  const authService = new AuthService(database, env.AUTH_SECRET);
  const dashboardService = new DashboardService(database);
  const websocketHub = new WebSocketHub();
  const correlationEngine = new CorrelationEngine(logger, alertsService, websocketHub);
  const app = await buildApp(logger, {
    agentInstallsService,
    agentsService,
    alertsService,
    authService,
    dashboardService,
    eventsService,
    metricsService,
    websocketHub
  });
  const tcpServer = createTcpServer({
    host: env.TCP_HOST,
    port: env.TCP_PORT,
    tlsEnabled: env.TLS_ENABLED,
    ...(env.TLS_CERT_PATH ? { tlsCertPath: env.TLS_CERT_PATH } : {}),
    ...(env.TLS_KEY_PATH ? { tlsKeyPath: env.TLS_KEY_PATH } : {}),
    logger,
    connections,
    agentsService,
    metricsService,
    eventsService,
    alertsService,
    correlationEngine,
    websocketHub
  });

  await tcpServer.start();
  await app.listen({
    host: env.API_HOST,
    port: env.API_PORT
  });

  logger.info(
    {
      apiPort: env.API_PORT,
      tcpPort: env.TCP_PORT
    },
    "Server started"
  );
}

void bootstrap();
