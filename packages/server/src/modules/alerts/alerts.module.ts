import type { FastifyInstance } from "fastify";

import { registerAlertsController } from "./alerts.controller.js";
import { AlertsService } from "./alerts.service.js";

export async function registerAlertsModule(app: FastifyInstance, service: AlertsService) {
  await registerAlertsController(app, service);
}
