import type { FastifyInstance } from "fastify";

import { registerEventsController } from "./events.controller.js";
import { EventsService } from "./events.service.js";

export async function registerEventsModule(app: FastifyInstance, service: EventsService) {
  await registerEventsController(app, service);
}
