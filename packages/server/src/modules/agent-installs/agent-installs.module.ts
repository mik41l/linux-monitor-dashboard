import type { FastifyInstance } from "fastify";

import { AuthService } from "../auth/auth.service.js";
import { registerAgentInstallsController } from "./agent-installs.controller.js";
import { AgentInstallsService } from "./agent-installs.service.js";

export async function registerAgentInstallsModule(
  app: FastifyInstance,
  service: AgentInstallsService,
  authService: AuthService
) {
  await registerAgentInstallsController(app, service, authService);
}
