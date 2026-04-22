import type { FastifyInstance, FastifyRequest } from "fastify";

import { HttpException } from "../../common/exceptions/http-exception.js";
import { AuthService, type AuthenticatedUser } from "./auth.service.js";
import {
  changePasswordBodySchema,
  createUserBodySchema,
  loginBodySchema,
  loginLogsQuerySchema,
  setPasswordBodySchema,
  updateUserBodySchema,
  userParamsSchema
} from "./auth.schema.js";

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

function requestMetadata(request: FastifyRequest) {
  return {
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"]
  };
}

export async function registerAuthController(app: FastifyInstance, service: AuthService) {
  app.post("/api/auth/login", async (request) => {
    const body = loginBodySchema.parse(request.body);
    const result = await service.login(body, requestMetadata(request));

    if (!result) {
      throw new HttpException(401, "Invalid email or password");
    }

    return {
      data: result
    };
  });

  app.post("/api/auth/logout", async () => ({
    data: {
      success: true
    }
  }));

  app.get("/api/auth/me", async (request) => ({
    data: await requireUser(request, service)
  }));

  app.put("/api/auth/password", async (request) => {
    const user = await requireUser(request, service);
    const body = changePasswordBodySchema.parse(request.body);
    const updated = await service.changeOwnPassword(user.id, body);

    if (!updated) {
      throw new HttpException(400, "Current password is invalid");
    }

    return {
      data: updated
    };
  });

  app.get("/api/auth/login-logs", async (request) => {
    const user = await requireUser(request, service);
    requireAdmin(user);
    const query = loginLogsQuerySchema.parse(request.query);

    return {
      data: await service.listLoginLogs(query)
    };
  });

  app.get("/api/users", async (request) => {
    const user = await requireUser(request, service);
    requireAdmin(user);

    return {
      data: await service.listUsers()
    };
  });

  app.post("/api/users", async (request) => {
    const user = await requireUser(request, service);
    requireAdmin(user);
    const body = createUserBodySchema.parse(request.body);

    return {
      data: await service.createUser(body)
    };
  });

  app.put("/api/users/:userId", async (request) => {
    const user = await requireUser(request, service);
    requireAdmin(user);
    const params = userParamsSchema.parse(request.params);
    const body = updateUserBodySchema.parse(request.body);
    const updated = await service.updateUser(params.userId, body);

    if (!updated) {
      throw new HttpException(404, "User not found");
    }

    return {
      data: updated
    };
  });

  app.put("/api/users/:userId/password", async (request) => {
    const user = await requireUser(request, service);
    requireAdmin(user);
    const params = userParamsSchema.parse(request.params);
    const body = setPasswordBodySchema.parse(request.body);
    const updated = await service.setPassword(params.userId, body);

    if (!updated) {
      throw new HttpException(404, "User not found");
    }

    return {
      data: updated
    };
  });
}
