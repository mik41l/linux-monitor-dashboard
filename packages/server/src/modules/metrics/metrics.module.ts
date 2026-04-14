import type { FastifyInstance } from "fastify";

import { registerMetricsController } from "./metrics.controller.js";
import { MetricsService } from "./metrics.service.js";

export async function registerMetricsModule(app: FastifyInstance, service: MetricsService) {
  await registerMetricsController(app, service);
}
