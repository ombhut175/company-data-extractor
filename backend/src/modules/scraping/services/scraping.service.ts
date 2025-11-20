import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import validator from "validator";
import { ScrapingRepository } from "../../../core/database/repositories/scraping.repository";
import { ScrapingQueueService } from "./scraping-queue.service";
import { ENV } from "../../../common/constants/string-const";

/**
 * Service for managing web scraping operations
 * Handles job creation, URL parsing, and coordination between repository and queue
 */
@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name);

  constructor(
    private readonly scrapingRepository: ScrapingRepository,
    private readonly scrapingQueueService: ScrapingQueueService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new scraping job
   * Accepts either a file with URLs or a mock server flag (XOR validation)
   *
   * @param userId - The authenticated user's ID
   * @param file - Optional uploaded text file containing URLs
   * @param useMockServer - Optional flag to use mock server instead of file
   * @returns Object containing the created job ID
   */
  async createJob(
    userId: string,
    file?: Express.Multer.File,
    useMockServer?: boolean,
  ): Promise<{ jobId: string }> {
    const requestId = crypto.randomUUID();

    this.logger.log("Creating scraping job", {
      operation: "createJob",
      requestId,
      userId,
      hasFile: !!file,
      useMockServer: !!useMockServer,
      fileName: file?.originalname,
      fileSize: file?.size,
      timestamp: new Date().toISOString(),
    });

    try {
      // Validate input: file XOR useMockServer
      if (!file && !useMockServer) {
        this.logger.warn("Job creation failed: no input provided", {
          operation: "createJob",
          requestId,
          userId,
          timestamp: new Date().toISOString(),
        });
        throw new BadRequestException(
          "Either provide a file with URLs or select mock server mode",
        );
      }

      if (file && useMockServer) {
        this.logger.warn("Job creation failed: both inputs provided", {
          operation: "createJob",
          requestId,
          userId,
          timestamp: new Date().toISOString(),
        });
        throw new BadRequestException(
          "Cannot provide both file and mock server mode. Choose one input method",
        );
      }

      // Extract URLs based on input mode
      let urls: string[];
      if (file) {
        urls = this.parseUrlsFromFile(file);
        this.logger.log("URLs parsed from file", {
          operation: "parseUrlsFromFile",
          requestId,
          userId,
          urlCount: urls.length,
          fileName: file.originalname,
          timestamp: new Date().toISOString(),
        });
      } else {
        const mockServerUrl = this.getMockServerUrl();
        urls = Array(15).fill(mockServerUrl);
        this.logger.log("Using mock server URL (15 parallel requests)", {
          operation: "getMockServerUrl",
          requestId,
          userId,
          mockServerUrl,
          urlCount: urls.length,
          timestamp: new Date().toISOString(),
        });
      }

      // Validate that we have at least one URL
      if (urls.length === 0) {
        this.logger.warn("Job creation failed: no URLs extracted", {
          operation: "createJob",
          requestId,
          userId,
          fileName: file?.originalname,
          timestamp: new Date().toISOString(),
        });
        throw new BadRequestException(
          "No valid URLs found. Please provide a file with at least one URL",
        );
      }

      // Create job record in database
      const job = await this.scrapingRepository.createJob({
        userId,
        totalUrls: urls.length,
        status: "pending",
      });

      this.logger.log("Scraping job created in database", {
        operation: "createJob",
        requestId,
        userId,
        jobId: job.id,
        totalUrls: urls.length,
        timestamp: new Date().toISOString(),
      });

      // Create scraping items in database
      const itemsData = urls.map((url) => ({
        jobId: job.id,
        url,
        status: "pending",
      }));

      const items = await this.scrapingRepository.createItems(itemsData);

      this.logger.log("Scraping items created in database", {
        operation: "createJob",
        requestId,
        userId,
        jobId: job.id,
        itemCount: items.length,
        timestamp: new Date().toISOString(),
      });

      // Update job status to "processing"
      await this.scrapingRepository.updateJobProgress(job.id);

      this.logger.log("Job status updated to processing", {
        operation: "createJob",
        requestId,
        userId,
        jobId: job.id,
        timestamp: new Date().toISOString(),
      });

      // Enqueue each URL as separate job in BullMQ for parallel processing
      const jobsToEnqueue = items.map((item) => ({
        itemId: item.id,
        url: item.url,
        jobId: job.id,
      }));

      const bullmqJobIds =
        await this.scrapingQueueService.enqueueMultipleUrlJobs(jobsToEnqueue);

      this.logger.log("All URLs enqueued successfully", {
        operation: "createJob",
        requestId,
        userId,
        jobId: job.id,
        enqueuedCount: bullmqJobIds.length,
        totalUrls: urls.length,
        timestamp: new Date().toISOString(),
      });

      return { jobId: job.id };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : "";

      this.logger.error(
        "Failed to create scraping job",
        {
          operation: "createJob",
          requestId,
          userId,
          hasFile: !!file,
          useMockServer: !!useMockServer,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
        errorStack,
      );

      // Re-throw known exceptions
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Wrap unknown errors
      throw new BadRequestException(
        "Failed to create scraping job. Please try again",
      );
    }
  }

  /**
   * Get job details with items, filtered by userId for security
   *
   * @param jobId - The job ID to retrieve
   * @param userId - The authenticated user's ID
   * @returns Job details with associated items
   */
  async getJob(
    jobId: string,
    userId: string,
  ): Promise<{ job: any; items: any[] }> {
    const requestId = crypto.randomUUID();

    this.logger.log("Retrieving job details", {
      operation: "getJob",
      requestId,
      userId,
      jobId,
      timestamp: new Date().toISOString(),
    });

    try {
      // Find job with userId verification for security
      const job = await this.scrapingRepository.findJobById(jobId, userId);

      if (!job) {
        this.logger.warn("Job not found or access denied", {
          operation: "getJob",
          requestId,
          userId,
          jobId,
          timestamp: new Date().toISOString(),
        });
        throw new NotFoundException(
          "Job not found or you do not have access to this job",
        );
      }

      // Get all items for the job
      const items = await this.scrapingRepository.findItemsByJobId(jobId);

      this.logger.log("Job details retrieved successfully", {
        operation: "getJob",
        requestId,
        userId,
        jobId,
        itemCount: items.length,
        jobStatus: job.status,
        timestamp: new Date().toISOString(),
      });

      return { job, items };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : "";

      this.logger.error(
        "Failed to retrieve job details",
        {
          operation: "getJob",
          requestId,
          userId,
          jobId,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
        errorStack,
      );

      // Re-throw known exceptions
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Wrap unknown errors
      throw new BadRequestException("Failed to retrieve job details");
    }
  }

  /**
   * List all jobs for a specific user
   *
   * @param userId - The authenticated user's ID
   * @returns Array of jobs belonging to the user
   */
  async listJobs(userId: string): Promise<any[]> {
    const requestId = crypto.randomUUID();

    this.logger.log("Listing jobs for user", {
      operation: "listJobs",
      requestId,
      userId,
      timestamp: new Date().toISOString(),
    });

    try {
      const jobs = await this.scrapingRepository.findJobsByUserId(userId);

      this.logger.log("Jobs retrieved successfully", {
        operation: "listJobs",
        requestId,
        userId,
        jobCount: jobs.length,
        timestamp: new Date().toISOString(),
      });

      return jobs;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : "";

      this.logger.error(
        "Failed to list jobs",
        {
          operation: "listJobs",
          requestId,
          userId,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
        errorStack,
      );

      throw new BadRequestException("Failed to retrieve jobs");
    }
  }

  /**
   * List all scraping items across all jobs for a specific user
   *
   * @param userId - The authenticated user's ID
   * @returns Array of items from all user's jobs
   */
  async listItems(userId: string): Promise<any[]> {
    const requestId = crypto.randomUUID();

    this.logger.log("Listing items for user", {
      operation: "listItems",
      requestId,
      userId,
      timestamp: new Date().toISOString(),
    });

    try {
      const items = await this.scrapingRepository.findItemsByUserId(userId);

      this.logger.log("Items retrieved successfully", {
        operation: "listItems",
        requestId,
        userId,
        itemCount: items.length,
        timestamp: new Date().toISOString(),
      });

      return items;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : "";

      this.logger.error(
        "Failed to list items",
        {
          operation: "listItems",
          requestId,
          userId,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
        errorStack,
      );

      throw new BadRequestException("Failed to retrieve items");
    }
  }

  /**
   * Parse URLs from uploaded text file
   * Extracts one URL per line, trims whitespace, and filters empty lines
   *
   * @param file - The uploaded text file
   * @returns Array of extracted URLs
   * @private
   */
  private parseUrlsFromFile(file: Express.Multer.File): string[] {
    try {
      // Convert buffer to string
      const content = file.buffer.toString("utf-8");

      // Split by newlines, trim whitespace, filter empty lines
      const urls = content
        .split(/\r?\n/)
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);

      // Validate URLs using validator.js
      const validUrls = urls.filter((url: string) => {
        const isValid = validator.isURL(url, {
          protocols: ["http", "https"],
          require_protocol: true,
          require_valid_protocol: true,
        });

        if (!isValid) {
          this.logger.warn("Invalid URL format detected", {
            operation: "parseUrlsFromFile",
            url,
            fileName: file.originalname,
            timestamp: new Date().toISOString(),
          });
        }
        return isValid;
      });

      if (validUrls.length === 0 && urls.length > 0) {
        throw new BadRequestException(
          "No valid URLs found in file. URLs must be valid http:// or https:// URLs",
        );
      }

      return validUrls;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error("Failed to parse URLs from file", {
        operation: "parseUrlsFromFile",
        fileName: file.originalname,
        fileSize: file.size,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        "Failed to parse file. Please ensure it is a valid text file with one URL per line",
      );
    }
  }

  /**
   * Retrieve mock server URL from environment configuration
   *
   * @returns The mock server URL
   * @throws BadRequestException if URL is not configured
   * @private
   */
  private getMockServerUrl(): string {
    const mockServerUrl = this.configService.get<string>(
      ENV.MOCK_COMPANY_DATA_SERVER_URL,
    );

    if (!mockServerUrl) {
      this.logger.error("Mock server URL not configured", {
        operation: "getMockServerUrl",
        envKey: ENV.MOCK_COMPANY_DATA_SERVER_URL,
        timestamp: new Date().toISOString(),
      });
      throw new BadRequestException(
        "Mock server is not configured. Please contact the administrator",
      );
    }

    return mockServerUrl;
  }
}
