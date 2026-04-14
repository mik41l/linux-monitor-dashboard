import { boolean, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const alertRules = pgTable(
  "alert_rules",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    condition: jsonb("condition").notNull(),
    severity: text("severity").notNull().default("warning"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    nameUnique: uniqueIndex("alert_rules_name_unique").on(table.name)
  })
);
