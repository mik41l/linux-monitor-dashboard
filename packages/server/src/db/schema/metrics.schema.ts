import { index, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { agents } from "./agents.schema.js";

export const metrics = pgTable(
  "metrics",
  {
    id: serial("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.agentId, { onDelete: "cascade" }),
    metricType: text("metric_type").notNull(),
    value: jsonb("value").notNull(),
    collectedAt: timestamp("collected_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    agentMetricIndex: index("metrics_agent_type_idx").on(table.agentId, table.metricType),
    collectedIndex: index("metrics_collected_at_idx").on(table.collectedAt)
  })
);

