import { index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { agents } from "./agents.schema.js";

export const sshdAudits = pgTable(
  "sshd_audits",
  {
    id: serial("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.agentId, { onDelete: "cascade" }),
    status: text("status").notNull(),
    riskScore: integer("risk_score").notNull().default(0),
    configPath: text("config_path").notNull(),
    payload: jsonb("payload").notNull(),
    collectedAt: timestamp("collected_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    agentIndex: index("sshd_audits_agent_idx").on(table.agentId),
    collectedIndex: index("sshd_audits_collected_idx").on(table.collectedAt)
  })
);
