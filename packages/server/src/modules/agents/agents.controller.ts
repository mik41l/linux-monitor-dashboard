import type { FastifyInstance } from "fastify";

import { HttpException } from "../../common/exceptions/http-exception.js";
import { AgentsService } from "./agents.service.js";
import { agentParamsSchema, listAgentsQuerySchema } from "./agents.schema.js";

export async function registerAgentsController(
  app: FastifyInstance,
  service: AgentsService
) {
  app.get("/api/agents", async (request) => {
    const query = listAgentsQuerySchema.parse(request.query);

    return {
      data: await service.listAgents(query)
    };
  });

  app.get("/api/agents/:agentId", async (request) => {
    const params = agentParamsSchema.parse(request.params);
    const agent = await service.getAgent(params.agentId);

    if (!agent) {
      throw new HttpException(404, "Agent not found");
    }

    return {
      data: agent
    };
  });

  app.get("/api/agents/:agentId/sshd-audit", async (request) => {
    const params = agentParamsSchema.parse(request.params);
    const audit = await service.getLatestSshdAudit(params.agentId);

    return {
      data: audit
    };
  });
}
