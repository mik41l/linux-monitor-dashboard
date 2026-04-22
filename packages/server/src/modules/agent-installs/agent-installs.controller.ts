import type { FastifyInstance, FastifyRequest } from "fastify";

import { HttpException } from "../../common/exceptions/http-exception.js";
import { AuthService, type AuthenticatedUser } from "../auth/auth.service.js";
import { AgentInstallsService } from "./agent-installs.service.js";
import { createAgentInstallBodySchema, installParamsSchema } from "./agent-installs.schema.js";

function extractBearerToken(request: FastifyRequest) {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return undefined;
  }

  return header.slice("Bearer ".length);
}

async function requireUser(request: FastifyRequest, service: AuthService) {
  const user = await service.authenticateToken(extractBearerToken(request));

  if (!user) {
    throw new HttpException(401, "Authentication required");
  }

  return user;
}

function requireAdmin(user: AuthenticatedUser) {
  if (user.role !== "admin") {
    throw new HttpException(403, "Admin role required");
  }
}

export async function registerAgentInstallsController(
  app: FastifyInstance,
  service: AgentInstallsService,
  authService: AuthService
) {
  app.get("/api/agent-installs", async (request) => {
    const user = await requireUser(request, authService);
    requireAdmin(user);

    return {
      data: await service.listInstalls()
    };
  });

  app.get("/api/agent-installs/:installId", async (request) => {
    const user = await requireUser(request, authService);
    requireAdmin(user);
    const params = installParamsSchema.parse(request.params);
    const install = await service.getInstall(params.installId);

    if (!install) {
      throw new HttpException(404, "Agent install not found");
    }

    return {
      data: install
    };
  });

  app.post("/api/agent-installs", async (request) => {
    const user = await requireUser(request, authService);
    requireAdmin(user);
    const body = createAgentInstallBodySchema.parse(request.body);
    const install = await service.createInstall(body, user.id);

    if (!install) {
      throw new HttpException(500, "Agent install could not be created");
    }

    return {
      data: install
    };
  });
}
