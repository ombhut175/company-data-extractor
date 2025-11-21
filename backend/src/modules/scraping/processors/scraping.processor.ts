import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job } from "bullmq";
import axios, { AxiosError } from "axios";
import * as cheerio from "cheerio";
import nlp from "compromise";
import * as crypto from "crypto";
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
 * CSS selectors for HTML parsing with fallback patterns
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
 * Fallback selectors for unstructured data extraction
 */
const FALLBACK_SELECTORS = {
  COMPANY_NAME: [
    "h1",
    "title",
    'meta[property="og:site_name"]',
    'meta[name="application-name"]',
    ".company-title",
    ".business-name",
    '[itemtype*="Organization"] [itemprop="name"]',
  ],
  WEBSITE: [
    'a[href*="http"]',
    'link[rel="canonical"]',
    'meta[property="og:url"]',
  ],
  INDUSTRY: [
    ".category",
    ".sector",
    '[itemprop="industry"]',
    'meta[name="keywords"]',
  ],
  HEADCOUNT: [
    ".employees",
    ".team-size",
    ".staff-count",
    '[itemprop="numberOfEmployees"]',
  ],
  LOCATION: [
    ".address",
    ".location",
    ".city",
    '[itemprop="address"]',
    '[itemprop="location"]',
    'meta[name="geo.position"]',
  ],
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

  // Cache NER results per request to avoid duplicate processing
  private nerCache = new Map<
    string,
    Partial<CompanyData> & { people: string[]; emails: string[] }
  >();

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

      // Parse company data and contacts with shared cheerio instance
      const $ = cheerio.load(html) as unknown as cheerio.CheerioAPI;
      const companyData = this.parseCompanyData($, itemId);
      const contacts = this.parseContacts($, itemId);

      // Clear NER cache for this item after processing
      this.nerCache.delete(itemId);

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
   * Try fallback selectors to extract value
   * Fixed logic to properly handle different selector types
   */
  private tryFallbackSelectors(
    $: cheerio.CheerioAPI,
    selectors: string[],
  ): string | null {
    for (const selector of selectors) {
      let value: string | undefined;

      try {
        if (selector.startsWith("meta")) {
          // Meta tags use content attribute
          value = $(selector).attr("content");
        } else if (selector === "title") {
          // Title tag text
          value = $("title").text();
        } else if (selector.startsWith("link")) {
          // Link tags use href attribute
          value = $(selector).attr("href");
        } else if (selector.includes("[href")) {
          // Anchor tags with href in selector
          value = $(selector).first().attr("href");
        } else {
          // Regular selectors use text content
          value = $(selector).first().text();
        }

        if (value) {
          const cleaned = value.trim();
          if (cleaned.length > 0 && cleaned.length < 500) {
            // Avoid extremely long extractions
            return cleaned;
          }
        }
      } catch {
        // Skip invalid selectors
        continue;
      }
    }

    return null;
  }

  /**
   * Extract company information using NLP from page text
   * Includes text size limit and null checks for performance
   * Uses caching to avoid duplicate processing for same item
   */
  private extractWithNER(
    $: cheerio.CheerioAPI,
    cacheKey: string,
  ): Partial<CompanyData> & { people: string[]; emails: string[] } {
    // Check cache first
    const cached = this.nerCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const MAX_TEXT_LENGTH = 100000; // 100KB limit for NLP processing
    let bodyText = $("body").text().replace(/\s+/g, " ").trim();

    // Return empty if no text found or text is too short
    if (!bodyText || bodyText.length < 50) {
      const emptyResult = {
        companyName: null,
        hqLocation: null,
        people: [],
        emails: [],
      };
      this.nerCache.set(cacheKey, emptyResult);
      return emptyResult;
    }

    // Limit text size for performance
    if (bodyText.length > MAX_TEXT_LENGTH) {
      bodyText = bodyText.substring(0, MAX_TEXT_LENGTH);
    }

    const doc = nlp(bodyText);

    const organizations = doc.organizations().out("array") as string[];
    const places = doc.places().out("array") as string[];
    const people = doc.people().out("array") as string[];

    // Extract emails using improved regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    const emails = bodyText.match(emailRegex) || [];

    // Filter noisy NER outputs
    const companyName =
      organizations.find((o) => o.length > 1 && o.length < 100) || null;
    const hqLocation =
      places.find((p) => p.length > 1 && p.length < 100) || null;

    const result = {
      companyName,
      hqLocation,
      people,
      emails,
    };

    // Cache result
    this.nerCache.set(cacheKey, result);
    return result;
  }

  /**
   * Parse company data from HTML using Cheerio
   * Extracts company name, website, industry, headcount, and location
   * Now accepts CheerioAPI instance for better performance
   */
  private parseCompanyData($: cheerio.CheerioAPI, itemId: string): CompanyData {
    const requestId = crypto.randomUUID();

    this.logger.log("Parsing company data", {
      operation: "parseCompanyData",
      requestId,
      timestamp: new Date().toISOString(),
    });

    try {
      // Layer 1: Try structured selectors
      let companyName = $(SELECTORS.COMPANY_NAME).text().trim() || null;
      let website = $(SELECTORS.COMPANY_WEBSITE).attr("href") || null;
      let industry = $(SELECTORS.INDUSTRY).text().trim() || null;
      let headcountRange = $(SELECTORS.HEADCOUNT).text().trim() || null;
      let hqLocation = $(SELECTORS.LOCATION).text().trim() || null;

      // Layer 2: Try fallback selectors for missing data
      if (!companyName) {
        companyName = this.tryFallbackSelectors(
          $,
          FALLBACK_SELECTORS.COMPANY_NAME,
        );
      }
      if (!website) {
        website = this.tryFallbackSelectors($, FALLBACK_SELECTORS.WEBSITE);
      }
      if (!industry) {
        industry = this.tryFallbackSelectors($, FALLBACK_SELECTORS.INDUSTRY);
      }
      if (!headcountRange) {
        headcountRange = this.tryFallbackSelectors(
          $,
          FALLBACK_SELECTORS.HEADCOUNT,
        );
      }
      if (!hqLocation) {
        hqLocation = this.tryFallbackSelectors($, FALLBACK_SELECTORS.LOCATION);
      }

      // Layer 3: Try NER extraction for company name and location if still missing
      if (!companyName || !hqLocation) {
        const nerData = this.extractWithNER($, itemId);
        if (!companyName && nerData.companyName) {
          companyName = nerData.companyName;
          this.logger.log("Company name extracted using NER", {
            operation: "parseCompanyData",
            requestId,
            companyName,
            timestamp: new Date().toISOString(),
          });
        }
        if (!hqLocation && nerData.hqLocation) {
          hqLocation = nerData.hqLocation;
          this.logger.log("Location extracted using NER", {
            operation: "parseCompanyData",
            requestId,
            hqLocation,
            timestamp: new Date().toISOString(),
          });
        }
      }

      const companyData: CompanyData = {
        companyName,
        website,
        industry,
        headcountRange,
        hqLocation,
      };

      this.logger.log("Company data parsed successfully", {
        operation: "parseCompanyData",
        requestId,
        companyName: companyData.companyName,
        hasWebsite: !!companyData.website,
        hasIndustry: !!companyData.industry,
        extractionMethod: this.getExtractionMethod(companyData),
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
   * Determine extraction method used (for logging)
   */
  private getExtractionMethod(data: CompanyData): string {
    const methods: string[] = [];
    if (data.companyName) methods.push("name");
    if (data.website) methods.push("website");
    if (data.industry) methods.push("industry");
    if (data.headcountRange) methods.push("headcount");
    if (data.hqLocation) methods.push("location");
    return methods.length > 0 ? methods.join("+") : "none";
  }

  /**
   * Parse contact information from HTML using Cheerio
   * Extracts contact cards with name, title, and email
   * Now accepts CheerioAPI instance for better performance
   */
  private parseContacts(
    $: cheerio.CheerioAPI,
    itemId: string,
  ): Contact[] | null {
    const requestId = crypto.randomUUID();

    this.logger.log("Parsing contacts", {
      operation: "parseContacts",
      requestId,
      timestamp: new Date().toISOString(),
    });

    try {
      const contacts: Contact[] = [];

      // Layer 1: Try structured contact cards
      $(SELECTORS.CONTACT_CARD).each((_, element) => {
        const name = $(element).find(SELECTORS.CONTACT_NAME).text().trim();
        const title = $(element).find(SELECTORS.CONTACT_TITLE).text().trim();
        const email = $(element).find(SELECTORS.CONTACT_EMAIL).text().trim();

        // Only add contact if all fields are present
        if (name && title && email) {
          contacts.push({ name, title, email });
        }
      });

      // Layer 2: If no structured contacts found, try extracting people names using NER
      if (contacts.length === 0) {
        const nerData = this.extractWithNER($, itemId);

        if (nerData.people.length > 0 && nerData.emails.length > 0) {
          // Improved matching: create unique email set and match with people
          const uniqueEmails = [...new Set(nerData.emails)];
          const maxMatches = Math.min(
            nerData.people.length,
            uniqueEmails.length,
          );

          // Match first N people with first N unique emails
          for (let i = 0; i < maxMatches; i++) {
            const person = nerData.people[i];
            const email = uniqueEmails[i];

            // Basic validation: person name should be reasonable length
            if (person && person.length > 1 && person.length < 100) {
              contacts.push({
                name: person,
                title: "Unknown",
                email: email,
              });
            }
          }

          if (contacts.length > 0) {
            this.logger.log("Contacts extracted using NER", {
              operation: "parseContacts",
              requestId,
              contactCount: contacts.length,
              peopleFound: nerData.people.length,
              emailsFound: nerData.emails.length,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }

      this.logger.log("Contacts parsed successfully", {
        operation: "parseContacts",
        requestId,
        contactCount: contacts.length,
        extractionMethod: contacts.length > 0 ? "structured or NER" : "none",
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
