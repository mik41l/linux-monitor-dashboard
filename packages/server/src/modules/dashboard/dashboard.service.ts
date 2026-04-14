import { count, desc, eq, gte, sql } from "drizzle-orm";

import { agents } from "../../db/schema/agents.schema.js";
import { alerts } from "../../db/schema/alerts.schema.js";
import { securityEvents } from "../../db/schema/security-events.schema.js";
import type { Database } from "../shared/database.types.js";

export class DashboardService {
  public constructor(private readonly database: Database) {}

  public async getSummary() {
    const totalAgentsResult = await this.database.db
      .select({ value: count() })
      .from(agents);
    const totalAgents = Number(totalAgentsResult[0]?.value ?? 0);

    const onlineAgentsResult = await this.database.db
      .select({ value: count() })
      .from(agents)
      .where(eq(agents.status, "online"));
    const onlineAgents = Number(onlineAgentsResult[0]?.value ?? 0);

    const openAlertsResult = await this.database.db
      .select({ value: count() })
      .from(alerts)
      .where(eq(alerts.status, "open"));
    const openAlerts = Number(openAlertsResult[0]?.value ?? 0);

    const securityEventsResult = await this.database.db
      .select({ value: count() })
      .from(securityEvents)
      .where(gte(securityEvents.occurredAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
    const securityEvents24h = Number(securityEventsResult[0]?.value ?? 0);

    const recentAlerts = await this.database.db
      .select()
      .from(alerts)
      .orderBy(desc(alerts.createdAt))
      .limit(5);

    const onlineTrend = await this.database.db.execute(sql`
      SELECT to_char(date_trunc('minute', last_heartbeat), 'HH24:MI') AS label,
             count(*)::int AS "onlineAgents"
      FROM agents
      WHERE last_heartbeat >= now() - interval '30 minutes'
      GROUP BY 1
      ORDER BY 1 ASC
      LIMIT 6
    `);

    const heartbeatSeries = onlineTrend.rows.map((row) => ({
      label: String(row.label),
      onlineAgents: Number(row.onlineAgents)
    }));

    const resourceTrend = await this.database.db.execute(sql`
      SELECT to_char(date_trunc('minute', collected_at), 'HH24:MI') AS label,
             round(avg(CASE WHEN metric_type = 'cpu' THEN (value->>'usagePercent')::numeric END), 1) AS cpu,
             round(avg(CASE WHEN metric_type = 'memory' THEN (value->>'usagePercent')::numeric END), 1) AS memory
      FROM metrics
      WHERE collected_at >= now() - interval '1 hour'
        AND metric_type IN ('cpu', 'memory')
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 12
    `);

    const resourceSeries = resourceTrend.rows
      .map((row) => ({
        label: String(row.label),
        cpu: Number(row.cpu ?? 0),
        memory: Number(row.memory ?? 0)
      }))
      .reverse();

    return {
      totals: {
        agents: Number(totalAgents),
        onlineAgents,
        offlineAgents: totalAgents - onlineAgents,
        openAlerts,
        securityEvents24h
      },
      heartbeatSeries:
        heartbeatSeries.length > 0
          ? heartbeatSeries
          : Array.from({ length: 6 }, (_, index) => ({
              label: `T-${5 - index}`,
              onlineAgents
            })),
      resourceSeries,
      recentAlerts
    };
  }
}
