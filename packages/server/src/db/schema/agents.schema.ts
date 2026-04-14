import { pgTable, serial, text, timestamp, uniqueIndex, jsonb } from "drizzle-orm/pg-core";

export const agents = pgTable(
  "agents",
  {
    id: serial("id").primaryKey(),
    agentId: text("agent_id").notNull(),
    hostname: text("hostname").notNull(),
    ipAddress: text("ip_address"),
    osInfo: jsonb("os_info"),
    status: text("status").notNull().default("online"),
    lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true }),
    registeredAt: timestamp("registered_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    agentIdUnique: uniqueIndex("agents_agent_id_unique").on(table.agentId)
  })
);

