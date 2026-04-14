import type { FastifyInstance } from "fastify";

import { registerDashboardController } from "./dashboard.controller.js";
import { DashboardService } from "./dashboard.service.js";

export async function registerDashboardModule(
  app: FastifyInstance,
  service: DashboardService
) {
  await registerDashboardController(app, service);
}
