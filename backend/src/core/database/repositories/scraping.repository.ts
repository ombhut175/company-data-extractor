import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { scrapingJobs, scrapingItems } from "../schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { Contact } from "../schema/scraping-items";

// Type definitions for entities
export interface ScrapingJobEntity {
  id: string;
  userId: string | null;
  status: string;
  totalUrls: number;
  processedUrls: number;
  failedUrls: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScrapingItemEntity {
  id: string;
  jobId: string;
  url: string;
  status: string;
  lastError: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  companyName: string | null;
  website: string | null;
  industry: string | null;
  headcountRange: string | null;
  hqLocation: string | null;
  contacts: Contact[] | null;
  rawData: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs for creating records
export interface CreateJobData {
  userId: string;
  totalUrls: number;
  status?: string;
}

export interface CreateItemData {
  jobId: string;
  url: string;
  status?: string;
}

@Injectable()
export class ScrapingRepository extends BaseRepository<ScrapingJobEntity> {
  /**
   * Create a new scraping job
   */
  async createJob(data: CreateJobData): Promise<ScrapingJobEntity> {
    this.logger.log(`Creating scraping job for user: ${data.userId}`);

    try {
      const result = await this.db
        .insert(scrapingJobs)
        .values({
          userId: data.userId,
          totalUrls: data.totalUrls,
          status: data.status || "pending",
          processedUrls: 0,
          failedUrls: 0,
        })
        .returning();

      this.logger.log(
        `Scraping job created successfully: ${result[0].id} for user ${data.userId}`,
      );
      return result[0] as ScrapingJobEntity;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Failed to create scraping job for user: ${data.userId}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Create multiple scraping items in batch
   */
  async createItems(items: CreateItemData[]): Promise<ScrapingItemEntity[]> {
    this.logger.log(`Creating ${items.length} scraping items in batch`);

    try {
      const values = items.map((item) => ({
        jobId: item.jobId,
        url: item.url,
        status: item.status || "pending",
      }));

      const result = await this.db
        .insert(scrapingItems)
        .values(values)
        .returning();

      this.logger.log(
        `Successfully created ${result.length} scraping items for job ${items[0]?.jobId}`,
      );
      return result as ScrapingItemEntity[];
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Failed to create scraping items batch (count: ${items.length})`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Find a job by ID with userId filter for security
   */
  async findJobById(
    jobId: string,
    userId: string,
  ): Promise<ScrapingJobEntity | null> {
    this.logger.log(`Finding job ${jobId} for user ${userId}`);

    try {
      const result = await this.db
        .select()
        .from(scrapingJobs)
        .where(and(eq(scrapingJobs.id, jobId), eq(scrapingJobs.userId, userId)))
        .limit(1);

      if (result.length > 0) {
        this.logger.log(`Job found: ${jobId} for user ${userId}`);
        return result[0] as ScrapingJobEntity;
      } else {
        this.logger.log(`Job not found: ${jobId} for user ${userId}`);
        return null;
      }
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Error finding job ${jobId} for user ${userId}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Find all items for a specific job
   */
  async findItemsByJobId(jobId: string): Promise<ScrapingItemEntity[]> {
    this.logger.log(`Finding items for job: ${jobId}`);

    try {
      const result = await this.db
        .select()
        .from(scrapingItems)
        .where(eq(scrapingItems.jobId, jobId));

      this.logger.log(`Found ${result.length} items for job ${jobId}`);
      return result as ScrapingItemEntity[];
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(`Error finding items for job ${jobId}`, errorStack);
      throw error;
    }
  }

  /**
   * Find all jobs for a specific user
   */
  async findJobsByUserId(userId: string): Promise<ScrapingJobEntity[]> {
    this.logger.log(`Finding jobs for user: ${userId}`);

    try {
      const result = await this.db
        .select()
        .from(scrapingJobs)
        .where(eq(scrapingJobs.userId, userId))
        .orderBy(sql`${scrapingJobs.createdAt} DESC`);

      this.logger.log(`Found ${result.length} jobs for user ${userId}`);
      return result as ScrapingJobEntity[];
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(`Error finding jobs for user ${userId}`, errorStack);
      throw error;
    }
  }

  /**
   * Find all items across all jobs for a specific user
   */
  async findItemsByUserId(userId: string): Promise<ScrapingItemEntity[]> {
    this.logger.log(`Finding items for user: ${userId}`);

    try {
      // First get all job IDs for the user
      const userJobs = await this.db
        .select({ id: scrapingJobs.id })
        .from(scrapingJobs)
        .where(eq(scrapingJobs.userId, userId));

      if (userJobs.length === 0) {
        this.logger.log(
          `No jobs found for user ${userId}, returning empty array`,
        );
        return [];
      }

      const jobIds = userJobs.map((job) => job.id);

      // Then get all items for those jobs
      const result = await this.db
        .select()
        .from(scrapingItems)
        .where(inArray(scrapingItems.jobId, jobIds))
        .orderBy(sql`${scrapingItems.createdAt} DESC`);

      this.logger.log(`Found ${result.length} items for user ${userId}`);
      return result as ScrapingItemEntity[];
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(`Error finding items for user ${userId}`, errorStack);
      throw error;
    }
  }

  /**
   * Update item status and related fields
   */
  async updateItemStatus(
    itemId: string,
    status: string,
    data?: Partial<ScrapingItemEntity>,
  ): Promise<void> {
    this.logger.log(`Updating item ${itemId} status to: ${status}`);

    try {
      const updateData: any = {
        status,
        updatedAt: new Date(),
        ...data,
      };

      await this.db
        .update(scrapingItems)
        .set(updateData)
        .where(eq(scrapingItems.id, itemId));

      this.logger.log(
        `Item ${itemId} updated successfully to status: ${status}`,
      );
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Error updating item ${itemId} to status ${status}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Recalculate and update job progress statistics
   */
  async updateJobProgress(jobId: string): Promise<void> {
    this.logger.log(`Updating job progress for: ${jobId}`);

    try {
      // Count completed and failed items
      const items = await this.db
        .select()
        .from(scrapingItems)
        .where(eq(scrapingItems.jobId, jobId));

      const completedCount = items.filter(
        (item) => item.status === "completed" || item.status === "failed",
      ).length;

      const failedCount = items.filter(
        (item) => item.status === "failed",
      ).length;

      const totalCount = items.length;

      // Determine job status
      let jobStatus = "processing";
      if (completedCount === totalCount && totalCount > 0) {
        // All items processed
        if (failedCount === totalCount) {
          jobStatus = "failed"; // All failed
        } else {
          jobStatus = "completed"; // At least one succeeded
        }
      }

      // Update job
      await this.db
        .update(scrapingJobs)
        .set({
          processedUrls: completedCount,
          failedUrls: failedCount,
          status: jobStatus,
          updatedAt: new Date(),
        })
        .where(eq(scrapingJobs.id, jobId));

      this.logger.log(
        `Job ${jobId} progress updated: ${completedCount}/${totalCount} processed, ${failedCount} failed, status: ${jobStatus}`,
      );
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(`Error updating job progress for ${jobId}`, errorStack);
      throw error;
    }
  }
}
