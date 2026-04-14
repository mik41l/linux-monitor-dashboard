import { and, desc, eq, gte } from "drizzle-orm";

import type { MetricData } from "@monitor/shared";

import { metrics } from "../../db/schema/metrics.schema.js";
import type { Database } from "../shared/database.types.js";

export class MetricsService {
  public constructor(private readonly database: Database) {}

  public async saveMetric(metric: MetricData) {
    await this.database.db.insert(metrics).values({
      agentId: metric.agentId,
      metricType: metric.metricType,
      value: metric.value,
      collectedAt: new Date(metric.collectedAt)
    });
  }

  public async listAgentMetrics(options: {
    agentId: string;
    metricType?: string;
    rangeMs: number;
    limit: number;
  }) {
    const conditions = [
      eq(metrics.agentId, options.agentId),
      gte(metrics.collectedAt, new Date(Date.now() - options.rangeMs))
    ];

    if (options.metricType) {
      conditions.push(eq(metrics.metricType, options.metricType));
    }

    return this.database.db
      .select()
      .from(metrics)
      .where(and(...conditions))
      .orderBy(desc(metrics.collectedAt))
      .limit(options.limit);
  }
}

