import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const healthChecking = pgTable("health_checking", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(),
  status: text("status").notNull(),
  message: text("message"),
  details: jsonb("details"),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
