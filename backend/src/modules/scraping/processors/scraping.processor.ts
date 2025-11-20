import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job } from "bullmq";
import axios, { AxiosError } from "axios";
import * as cheerio from "cheerio";
import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";
import { ScrapingRepository } from "../../../core/database/repositories/scraping.repository";
import { ScrapeJobData } from "../services/scraping-queue.service";
import { Contact } from "../../../core/database/schema/scraping-items";
import { ENV } from "../../../common/constants/string-const";

/**
 * Interface for extracted company data
 */
interface CompanyData {
  companyName: string | null;
  website: string | null;
  industry: string | null;
  headcountRange: string | null;
  hqLocation: string | null;
}

/**
 * CSS selectors for HTML parsing
 */
const SELECTORS = {
  COMPANY_NAME: "h1.company-name",
  COMPANY_WEBSITE: "a.company-website",
  INDUSTRY: "span.industry",
  HEADCOUNT: "span.headcount",
  LOCATION: "span.location",
  CONTACT_CARD: ".contact-card",
  CONTACT_NAME: ".contact-name",
  CONTACT_TITLE: ".contact-title",
  CONTACT_EMAIL: ".contact-email",
};

/**
 * Background processor for scraping jobs
 * Processes URLs from the queue, fetches HTML, extracts data, and updates database
 */
@Processor("scrape-queue", { concurrency: 20 })
export class ScrapingProcessor extends WorkerHost {
  private readonly logger = new Logger(ScrapingProcessor.name);
  private readonly httpAgent: HttpAgent;
  private readonly httpsAgent: HttpsAgent;

  constructor(
    private readonly scrapingRepository: ScrapingRepository,
    private readonly configService: ConfigService,
  ) {
    super();

    this.httpAgent = new HttpAgent({
      keepAlive: true,
      maxSockets: 10,
      maxFreeSockets: 5,
      timeout: 30000,
    });

    this.httpsAgent = new HttpsAgent({
      keepAlive: true,
      maxSockets: 10,
      maxFreeSockets: 5,
      timeout: 30000,
    });
  }

  /**
   * Main process method called by BullMQ for each job
   * Processes a single URL per job for parallel execution
   */
  async process(job: Job<ScrapeJobData>): Promise<void> {
    const { itemId, url, jobId } = job.data;
    const requestId = crypto.randomUUID();

    this.logger.log("Processing single URL job", {
      operation: "process",
      requestId,
      itemId,
      url,
      jobId,
      bullmqJobId: job.id,
      timestamp: new Date().toISOString(),
    });

    try {
      await this.processItem(itemId, url, jobId);

      this.logger.log("URL processing completed successfully", {
        operation: "process",
        requestId,
        itemId,
        url,
        jobId,
        bullmqJobId: job.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        "URL processing failed",
        {
          operation: "process",
          requestId,
          itemId,
          url,
          jobId,
          bullmqJobId: job.id,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Event handler for completed jobs
   */
  @OnWorkerEvent("completed")
  onCompleted(job: Job): void {
    this.logger.log("Worker job completed", {
      event: "completed",
      bullmqJobId: job.id,
      jobData: job.data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Event handler for failed jobs
   */
  @OnWorkerEvent("failed")
  onFailed(job: Job, err: Error): void {
    this.logger.error(
      "Worker job failed",
      {
        event: "failed",
        bullmqJobId: job.id,
        jobData: job.data,
        error: err.message,
        timestamp: new Date().toISOString(),
      },
      err.stack,
    );
  }

  /**
   * Process a single scraping item
   * Fetches HTML, parses data, and updates database
   */
  private async processItem(
    itemId: string,
    url: string,
    jobId: string,
  ): Promise<void> {
    const requestId = crypto.randomUUID();

    this.logger.log("Processing item", {
      operation: "processItem",
      requestId,
      itemId,
      url,
      jobId,
      timestamp: new Date().toISOString(),
    });

    try {
      // Update item status to "processing"
      await this.scrapingRepository.updateItemStatus(itemId, "processing", {
        startedAt: new Date(),
      });

      this.logger.log("Item status updated to processing", {
        operation: "processItem",
        requestId,
        itemId,
        url,
        timestamp: new Date().toISOString(),
      });

      // Apply rate limiting before fetching
      await this.applyRateLimit();

      // Fetch HTML content
      const html = await this.fetchHtml(url);

      this.logger.log("HTML fetched successfully", {
        operation: "processItem",
        requestId,
        itemId,
        url,
        htmlLength: html.length,
        timestamp: new Date().toISOString(),
      });

      // Parse company data and contacts
      const companyData = this.parseCompanyData(html);
      const contacts = this.parseContacts(html);

      this.logger.log("Data parsed successfully", {
        operation: "processItem",
        requestId,
        itemId,
        url,
        companyName: companyData.companyName,
        contactCount: contacts?.length || 0,
        timestamp: new Date().toISOString(),
      });

      // Update item with extracted data
      await this.scrapingRepository.updateItemStatus(itemId, "completed", {
        ...companyData,
        contacts,
        rawData: {
          url,
          htmlLength: html.length,
          scrapedAt: new Date().toISOString(),
        },
        finishedAt: new Date(),
        lastError: null,
      });

      this.logger.log("Item completed successfully", {
        operation: "processItem",
        requestId,
        itemId,
        url,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : "";

      this.logger.error(
        "Item processing failed",
        {
          operation: "processItem",
          requestId,
          itemId,
          url,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
        errorStack,
      );

      // Update item status to "failed" with error message
      await this.scrapingRepository.updateItemStatus(itemId, "failed", {
        lastError: errorMessage,
        finishedAt: new Date(),
      });

      this.logger.log("Item marked as failed", {
        operation: "processItem",
        requestId,
        itemId,
        url,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    } finally {
      // Always update job progress after each item completes
      try {
        await this.scrapingRepository.updateJobProgress(jobId);

        this.logger.log("Job progress updated", {
          operation: "processItem",
          requestId,
          itemId,
          jobId,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const errorStack = error instanceof Error ? error.stack : "";
        this.logger.error(
          "Failed to update job progress",
          {
            operation: "processItem",
            requestId,
            itemId,
            jobId,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          },
          errorStack,
        );
      }
    }
  }

  /**
   * Fetch HTML content from URL using axios
   * Includes timeout and User-Agent header
   */
  private async fetchHtml(url: string): Promise<string> {
    const requestId = crypto.randomUUID();

    this.logger.log("Fetching HTML", {
      operation: "fetchHtml",
      requestId,
      url,
      timestamp: new Date().toISOString(),
    });

    try {
      const response = await axios.get(url, {
        timeout: 30000,
        httpAgent: this.httpAgent,
        httpsAgent: this.httpsAgent,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        validateStatus: (status) => status < 400,
        maxRedirects: 5,
      });

      this.logger.log("HTML fetched successfully", {
        operation: "fetchHtml",
        requestId,
        url,
        statusCode: response.status,
        contentLength: response.data.length,
        timestamp: new Date().toISOString(),
      });

      return response.data;
    } catch (error) {
      let errorMessage = "Unknown error";
      let statusCode: number | undefined;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        statusCode = axiosError.response?.status;

        if (statusCode && statusCode >= 400) {
          errorMessage = `HTTP ${statusCode}`;
        } else if (axiosError.code === "ECONNABORTED") {
          errorMessage = "Request timeout";
        } else if (axiosError.code === "ECONNREFUSED") {
          errorMessage = "Connection refused";
        } else if (axiosError.code === "ENOTFOUND") {
          errorMessage = "DNS resolution failed";
        } else if (axiosError.code === "ECONNRESET") {
          errorMessage = "Connection reset by server";
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        "Failed to fetch HTML",
        {
          operation: "fetchHtml",
          requestId,
          url,
          statusCode,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
        errorStack,
      );

      throw new Error(errorMessage);
    }
  }

  /**
   * Parse company data from HTML using Cheerio
   * Extracts company name, website, industry, headcount, and location
   */
  private parseCompanyData(html: string): CompanyData {
    const requestId = crypto.randomUUID();

    this.logger.log("Parsing company data", {
      operation: "parseCompanyData",
      requestId,
      htmlLength: html.length,
      timestamp: new Date().toISOString(),
    });

    try {
      const $ = cheerio.load(html);

      const companyData: CompanyData = {
        companyName: $(SELECTORS.COMPANY_NAME).text().trim() || null,
        website: $(SELECTORS.COMPANY_WEBSITE).attr("href") || null,
        industry: $(SELECTORS.INDUSTRY).text().trim() || null,
        headcountRange: $(SELECTORS.HEADCOUNT).text().trim() || null,
        hqLocation: $(SELECTORS.LOCATION).text().trim() || null,
      };

      this.logger.log("Company data parsed successfully", {
        operation: "parseCompanyData",
        requestId,
        companyName: companyData.companyName,
        hasWebsite: !!companyData.website,
        hasIndustry: !!companyData.industry,
        timestamp: new Date().toISOString(),
      });

      return companyData;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        "Failed to parse company data",
        {
          operation: "parseCompanyData",
          requestId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        errorStack,
      );

      // Return null values on parsing failure (graceful degradation)
      return {
        companyName: null,
        website: null,
        industry: null,
        headcountRange: null,
        hqLocation: null,
      };
    }
  }

  /**
   * Parse contact information from HTML using Cheerio
   * Extracts contact cards with name, title, and email
   */
  private parseContacts(html: string): Contact[] | null {
    const requestId = crypto.randomUUID();

    this.logger.log("Parsing contacts", {
      operation: "parseContacts",
      requestId,
      htmlLength: html.length,
      timestamp: new Date().toISOString(),
    });

    try {
      const $ = cheerio.load(html);
      const contacts: Contact[] = [];

      $(SELECTORS.CONTACT_CARD).each((_, element) => {
        const name = $(element).find(SELECTORS.CONTACT_NAME).text().trim();
        const title = $(element).find(SELECTORS.CONTACT_TITLE).text().trim();
        const email = $(element).find(SELECTORS.CONTACT_EMAIL).text().trim();

        // Only add contact if all fields are present
        if (name && title && email) {
          contacts.push({ name, title, email });
        }
      });

      this.logger.log("Contacts parsed successfully", {
        operation: "parseContacts",
        requestId,
        contactCount: contacts.length,
        timestamp: new Date().toISOString(),
      });

      // Return null instead of empty array if no contacts found
      return contacts.length > 0 ? contacts : null;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        "Failed to parse contacts",
        {
          operation: "parseContacts",
          requestId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        errorStack,
      );

      // Return null on parsing failure (graceful degradation)
      return null;
    }
  }

  /**
   * Apply rate limiting delay between requests
   * Uses REQUEST_DELAY_MS environment variable
   */
  private async applyRateLimit(): Promise<void> {
    const delayMs = this.configService.get<number>(ENV.REQUEST_DELAY_MS, 500);

    if (delayMs > 0) {
      this.logger.log("Applying rate limit", {
        operation: "applyRateLimit",
        delayMs,
        timestamp: new Date().toISOString(),
      });

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
