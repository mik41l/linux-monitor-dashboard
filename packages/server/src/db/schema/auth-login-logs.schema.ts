import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { users } from "./users.schema.js";

export const authLoginLogs = pgTable("auth_login_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  status: text("status").notNull(),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
