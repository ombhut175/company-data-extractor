import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { users } from "./users";

export const scrapingJobs = pgTable("scraping_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  // pending | processing | completed | failed
  totalUrls: integer("total_urls").notNull().default(0),
  processedUrls: integer("processed_urls").notNull().default(0),
  failedUrls: integer("failed_urls").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
