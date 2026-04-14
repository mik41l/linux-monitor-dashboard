import { index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { agents } from "./agents.schema.js";

export const hardeningReports = pgTable(
  "hardening_reports",
  {
    id: serial("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.agentId, { onDelete: "cascade" }),
    status: text("status").notNull(),
    overallScore: integer("overall_score").notNull().default(0),
    payload: jsonb("payload").notNull(),
    collectedAt: timestamp("collected_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    agentIndex: index("hardening_reports_agent_idx").on(table.agentId),
    collectedIndex: index("hardening_reports_collected_idx").on(table.collectedAt)
  })
);
