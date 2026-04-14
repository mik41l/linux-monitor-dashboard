import Fastify from "fastify";
import cors from "@fastify/cors";
import type pino from "pino";

import { registerAgentsModule } from "./modules/agents/agents.module.js";
import { AgentsService } from "./modules/agents/agents.service.js";
import { registerAlertsModule } from "./modules/alerts/alerts.module.js";
import { AlertsService } from "./modules/alerts/alerts.service.js";
import { registerDashboardModule } from "./modules/dashboard/dashboard.module.js";
import { DashboardService } from "./modules/dashboard/dashboard.service.js";
import { registerEventsModule } from "./modules/events/events.module.js";
import { EventsService } from "./modules/events/events.service.js";
import { registerMetricsModule } from "./modules/metrics/metrics.module.js";
import { MetricsService } from "./modules/metrics/metrics.service.js";
import { registerErrorMiddleware } from "./common/middleware/error.middleware.js";
import { registerWebSocketServer } from "./websocket/ws-server.js";
import { WebSocketHub } from "./websocket/ws-hub.js";

export interface AppServices {
  agentsService: AgentsService;
  alertsService: AlertsService;
  dashboardService: DashboardService;
  eventsService: EventsService;
  metricsService: MetricsService;
  websocketHub: WebSocketHub;
}

export async function buildApp(logger: pino.Logger, services: AppServices) {
  logger.debug("Creating Fastify app");

  const app = Fastify({
    logger: false
  });

  await app.register(cors, {
    origin: true
  });
  registerErrorMiddleware(app);
  await registerWebSocketServer(app, services.websocketHub);

  app.get("/api/health", async () => ({
    status: "ok",
    uptimeSeconds: Math.floor(process.uptime())
  }));

  await registerAgentsModule(app, services.agentsService);
  await registerMetricsModule(app, services.metricsService);
  await registerEventsModule(app, services.eventsService);
  await registerAlertsModule(app, services.alertsService);
  await registerDashboardModule(app, services.dashboardService);

  return app;
}
