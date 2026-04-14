import { index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { agents } from "./agents.schema.js";

export const securityEvents = pgTable(
  "security_events",
  {
    id: serial("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.agentId, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    severity: text("severity").notNull(),
    source: text("source"),
    message: text("message"),
    details: jsonb("details"),
    correlatedEventId: integer("correlated_event_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    agentIndex: index("security_events_agent_idx").on(table.agentId),
    occurredIndex: index("security_events_occurred_at_idx").on(table.occurredAt),
    severityIndex: index("security_events_severity_idx").on(table.severity)
  })
);

