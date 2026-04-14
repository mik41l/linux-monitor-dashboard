import type { FastifyInstance } from "fastify";

import { registerAgentsController } from "./agents.controller.js";
import { AgentsService } from "./agents.service.js";

export async function registerAgentsModule(
  app: FastifyInstance,
  service: AgentsService
) {
  await registerAgentsController(app, service);
}
