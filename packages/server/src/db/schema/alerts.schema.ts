import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { agents } from "./agents.schema.js";

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  ruleName: text("rule_name").notNull(),
  severity: text("severity").notNull(),
  agentId: text("agent_id").references(() => agents.agentId, { onDelete: "set null" }),
  message: text("message").notNull(),
  relatedEvents: jsonb("related_events").notNull().default([]),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true })
});

