import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { scrapingJobs } from "./scraping-jobs";

export interface Contact {
  name: string;
  title: string;
  email: string;
}

export const scrapingItems = pgTable("scraping_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => scrapingJobs.id),

  url: text("url").notNull(),

  status: text("status").notNull().default("pending"),
  // pending | queued | processing | completed | failed

  lastError: text("last_error"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),

  companyName: text("company_name"),
  website: text("website"),
  industry: text("industry"),
  headcountRange: text("headcount_range"),
  hqLocation: text("hq_location"),

  contacts: jsonb("contacts").$type<Contact[] | null>(),
  rawData: jsonb("raw_data").$type<Record<string, any> | null>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
