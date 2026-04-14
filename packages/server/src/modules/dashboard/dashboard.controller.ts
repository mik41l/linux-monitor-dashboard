import type { FastifyInstance } from "fastify";

import { DashboardService } from "./dashboard.service.js";

export async function registerDashboardController(
  app: FastifyInstance,
  service: DashboardService
) {
  app.get("/api/dashboard/summary", async () => ({
    data: await service.getSummary()
  }));
}
