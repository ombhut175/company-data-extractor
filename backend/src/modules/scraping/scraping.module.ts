import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { DatabaseModule } from "../../core/database/database.module";
import { SupabaseModule } from "../../core/supabase/supabase.module";
import { ScrapingController } from "./scraping.controller";
import { ScrapingItemsController } from "./scraping-items.controller";
import { ScrapingService } from "./services/scraping.service";
import { ScrapingQueueService } from "./services/scraping-queue.service";
import { ScrapingRepository } from "../../core/database/repositories/scraping.repository";
import { ScrapingProcessor } from "./processors/scraping.processor";

/**
 * Module for web scraping functionality
 * Handles job creation, queue management, and background processing
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: "scrape-queue",
    }),
    DatabaseModule,
    SupabaseModule,
  ],
  controllers: [ScrapingController, ScrapingItemsController],
  providers: [
    ScrapingService,
    ScrapingQueueService,
    ScrapingRepository,
    ScrapingProcessor,
  ],
  exports: [ScrapingService],
})
export class ScrapingModule {}
