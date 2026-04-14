import { index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { agents } from "./agents.schema.js";

export const firewallAudits = pgTable(
  "firewall_audits",
  {
    id: serial("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.agentId, { onDelete: "cascade" }),
    status: text("status").notNull(),
    riskScore: integer("risk_score").notNull().default(0),
    payload: jsonb("payload").notNull(),
    collectedAt: timestamp("collected_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    agentIndex: index("firewall_audits_agent_idx").on(table.agentId),
    collectedIndex: index("firewall_audits_collected_idx").on(table.collectedAt)
  })
);
