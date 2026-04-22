import type { FastifyInstance } from "fastify";

import { registerAuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

export async function registerAuthModule(app: FastifyInstance, service: AuthService) {
  await registerAuthController(app, service);
}
