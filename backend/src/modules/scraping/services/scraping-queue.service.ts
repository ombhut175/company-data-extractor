import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

/**
 * Job data structure for scraping queue
 */
export interface ScrapeJobData {
  itemId: string;
  url: string;
  jobId: string;
}

/**
 * Queue status interface for monitoring
 */
export interface QueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

/**
 * Service for managing BullMQ scraping queue operations
 * Handles job enqueuing, configuration, and monitoring
 */
@Injectable()
export class ScrapingQueueService {
  private readonly logger = new Logger(ScrapingQueueService.name);

  constructor(
    @InjectQueue("scrape-queue") private readonly scrapeQueue: Queue,
  ) {}

  /**
   * Enqueue a single URL scraping job
   * Configures retry attempts and exponential backoff
   *
   * @param itemId - The unique identifier for the scraping item
   * @param url - URL to scrape
   * @param jobId - The parent job ID
   * @returns The BullMQ job ID
   */
  async enqueueSingleUrlJob(
    itemId: string,
    url: string,
    jobId: string,
  ): Promise<string> {
    this.logger.log(`Enqueuing single URL job`, {
      operation: "enqueueSingleUrlJob",
      itemId,
      url,
      jobId,
      timestamp: new Date().toISOString(),
    });

    try {
      const job = await this.scrapeQueue.add(
        "scrape-url",
        {
          itemId,
          url,
          jobId,
        } as ScrapeJobData,
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
          removeOnComplete: {
            age: 3600,
          },
          removeOnFail: {
            age: 86400,
          },
        },
      );

      if (!job.id) {
        throw new Error("Failed to create scraping job - job ID not assigned");
      }

      this.logger.log(`Single URL job enqueued successfully`, {
        operation: "enqueueSingleUrlJob",
        itemId,
        url,
        jobId,
        bullmqJobId: job.id,
        timestamp: new Date().toISOString(),
      });

      return job.id;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Failed to enqueue single URL job`,
        {
          operation: "enqueueSingleUrlJob",
          itemId,
          url,
          jobId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Enqueue multiple URLs as separate parallel jobs
   *
   * @param items - Array of items with itemId, url, and jobId
   * @returns Array of BullMQ job IDs
   */
  async enqueueMultipleUrlJobs(
    items: Array<{ itemId: string; url: string; jobId: string }>,
  ): Promise<string[]> {
    this.logger.log(`Enqueuing multiple URL jobs`, {
      operation: "enqueueMultipleUrlJobs",
      itemCount: items.length,
      timestamp: new Date().toISOString(),
    });

    try {
      const jobPromises = items.map((item) =>
        this.enqueueSingleUrlJob(item.itemId, item.url, item.jobId),
      );

      const bullmqJobIds = await Promise.all(jobPromises);

      this.logger.log(`Multiple URL jobs enqueued successfully`, {
        operation: "enqueueMultipleUrlJobs",
        itemCount: items.length,
        timestamp: new Date().toISOString(),
      });

      return bullmqJobIds;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Failed to enqueue multiple URL jobs`,
        {
          operation: "enqueueMultipleUrlJobs",
          itemCount: items.length,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Get current queue status for monitoring
   * Returns counts of jobs in different states
   *
   * @returns Queue status with job counts
   */
  async getQueueStatus(): Promise<QueueStatus> {
    this.logger.log(`Retrieving queue status`, {
      operation: "getQueueStatus",
      timestamp: new Date().toISOString(),
    });

    try {
      const counts = await this.scrapeQueue.getJobCounts();

      const status: QueueStatus = {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
      };

      this.logger.log(`Queue status retrieved successfully`, {
        operation: "getQueueStatus",
        status,
        timestamp: new Date().toISOString(),
      });

      return status;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Failed to retrieve queue status`,
        {
          operation: "getQueueStatus",
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        errorStack,
      );
      throw error;
    }
  }
}
