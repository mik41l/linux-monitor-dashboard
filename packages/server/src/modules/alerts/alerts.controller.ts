import type { FastifyInstance } from "fastify";

import { AlertsService } from "./alerts.service.js";
import {
  alertParamsSchema,
  alertRuleBodySchema,
  alertRuleParamsSchema,
  alertsQuerySchema
} from "./alerts.schema.js";

export async function registerAlertsController(
  app: FastifyInstance,
  service: AlertsService
) {
  app.get("/api/alerts", async (request) => {
    const query = alertsQuerySchema.parse(request.query);

    return {
      data: await service.listAlerts(query)
    };
  });

  app.get("/api/alerts/rules", async () => ({
    data: await service.listRules()
  }));

  app.put("/api/alerts/:id/resolve", async (request) => {
    const params = alertParamsSchema.parse(request.params);
    await service.resolveAlert(params.id);

    return {
      success: true
    };
  });

  app.put("/api/alerts/rules/:id", async (request) => {
    const params = alertRuleParamsSchema.parse(request.params);
    const body = alertRuleBodySchema.parse(request.body);
    const rule = await service.updateRule(params.id, body);

    return {
      data: rule
    };
  });
}
