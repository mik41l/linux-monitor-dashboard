import type { FastifyInstance } from "fastify";

import { EventsService } from "./events.service.js";
import { eventsQuerySchema } from "./events.schema.js";

export async function registerEventsController(
  app: FastifyInstance,
  service: EventsService
) {
  app.get("/api/events", async (request) => {
    const query = eventsQuerySchema.parse(request.query);

    return {
      data: await service.listEvents({
        limit: query.limit,
        page: query.page,
        ...(query.severity ? { severity: query.severity } : {}),
        ...(query.eventType ? { eventType: query.eventType } : {}),
        ...(query.agentId ? { agentId: query.agentId } : {}),
        ...(query.dateFrom ? { dateFrom: query.dateFrom } : {}),
        ...(query.dateTo ? { dateTo: query.dateTo } : {})
      })
    };
  });
}
