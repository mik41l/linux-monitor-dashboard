import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { users } from "./users.schema.js";

export const agentInstalls = pgTable("agent_installs", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  agentName: text("agent_name").notNull(),
  host: text("host").notNull(),
  sshPort: integer("ssh_port").notNull().default(22),
  sshUsername: text("ssh_username").notNull(),
  authMethod: text("auth_method").notNull(),
  status: text("status").notNull().default("pending"),
  installLog: text("install_log").notNull().default(""),
  lastError: text("last_error"),
  createdByUserId: integer("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true })
});
