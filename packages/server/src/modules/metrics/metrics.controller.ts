import type { FastifyInstance } from "fastify";

import { MetricsService } from "./metrics.service.js";
import { metricsParamsSchema, metricsQuerySchema } from "./metrics.schema.js";

function parseRange(range: string | undefined) {
  if (!range) {
    return 60 * 60 * 1000;
  }

  const numeric = Number.parseInt(range, 10);

  if (range.endsWith("h")) {
    return numeric * 60 * 60 * 1000;
  }

  return numeric * 60 * 1000;
}

export async function registerMetricsController(
  app: FastifyInstance,
  service: MetricsService
) {
  app.get("/api/agents/:agentId/metrics", async (request) => {
    const params = metricsParamsSchema.parse(request.params);
    const query = metricsQuerySchema.parse(request.query);

    return {
      data: await service.listAgentMetrics({
        agentId: params.agentId,
        rangeMs: parseRange(query.range),
        limit: query.limit,
        ...(query.type ? { metricType: query.type } : {})
      })
    };
  });
}
