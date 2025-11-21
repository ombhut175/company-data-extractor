import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from "@nestjs/swagger";
import { AuthGuard } from "../../common/guards/auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ScrapingService } from "./services/scraping.service";
import { CreateScrapingJobDto } from "./dto/create-scraping-job.dto";
import {
  CreateScrapingJobResponseDto,
  JobWithItemsDto,
  ScrapingJobDto,
} from "./dto/scraping-responses.dto";
import {
  successResponse,
  createdResponse,
} from "../../common/helpers/api-response.helper";

/**
 * Controller for managing scraping jobs
 * All endpoints require authentication via AuthGuard
 */
@ApiTags("Scraping Jobs")
@Controller("scraping-jobs")
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ScrapingController {
  private readonly logger = new Logger(ScrapingController.name);

  constructor(private readonly scrapingService: ScrapingService) {}

  /**
   * Create a new scraping job
   * Accepts either a file upload with URLs or a mock server flag
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Create a new scraping job",
    description:
      "Create a new scraping job by uploading a text file with URLs (one per line) or using the mock server mode. Only one input method can be used at a time.",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "Text file containing URLs (one per line)",
        },
        useMockServer: {
          type: "boolean",
          description:
            "Flag to use mock server for testing instead of file upload",
          example: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Scraping job created successfully",
    type: CreateScrapingJobResponseDto,
    schema: {
      example: {
        statusCode: 201,
        success: true,
        message: "Scraping job created successfully",
        data: {
          jobId: "123e4567-e89b-12d3-a456-426614174000",
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      "Invalid input - either no input provided, both inputs provided, or invalid file format",
    schema: {
      example: {
        statusCode: 400,
        message: "Either provide a file with URLs or select mock server mode",
        timestamp: "2023-12-01T10:00:00.000Z",
        path: "/api/scraping-jobs",
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: "Invalid or missing authentication token",
    schema: {
      example: {
        statusCode: 401,
        message: "Invalid or expired token",
        timestamp: "2023-12-01T10:00:00.000Z",
        path: "/api/scraping-jobs",
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: "Internal server error during job creation",
  })
  async createJob(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateScrapingJobDto,
    @CurrentUser("id") userId: string,
  ) {
    const requestId = crypto.randomUUID();

    this.logger.log("Create scraping job request received", {
      operation: "createJob",
      requestId,
      userId,
      hasFile: !!file,
      useMockServer: dto.useMockServer,
      fileName: file?.originalname,
      fileSize: file?.size,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await this.scrapingService.createJob(
        userId,
        file,
        dto.useMockServer,
      );

      this.logger.log("Scraping job created successfully", {
        operation: "createJob",
        requestId,
        userId,
        jobId: result.jobId,
        timestamp: new Date().toISOString(),
      });

      return createdResponse(result, "Scraping job created successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";

      this.logger.error(
        "Failed to create scraping job",
        {
          operation: "createJob",
          requestId,
          userId,
          hasFile: !!file,
          useMockServer: dto.useMockServer,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
        errorStack,
      );

      // Delegate to global exception filter
      throw error;
    }
  }

  /**
   * List all scraping jobs for the authenticated user
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "List all scraping jobs",
    description:
      "Retrieve a list of all scraping jobs created by the authenticated user, ordered by creation date (newest first).",
  })
  @ApiResponse({
    status: 200,
    description: "Jobs retrieved successfully",
    type: [ScrapingJobDto],
    schema: {
      example: {
        statusCode: 200,
        success: true,
        message: "Jobs retrieved successfully",
        data: [
          {
            id: "123e4567-e89b-12d3-a456-426614174000",
            userId: "987e6543-e21b-12d3-a456-426614174000",
            status: "processing",
            totalUrls: 10,
            processedUrls: 5,
            failedUrls: 1,
            createdAt: "2023-12-01T10:00:00.000Z",
            updatedAt: "2023-12-01T10:30:00.000Z",
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: "Invalid or missing authentication token",
    schema: {
      example: {
        statusCode: 401,
        message: "Invalid or expired token",
        timestamp: "2023-12-01T10:00:00.000Z",
        path: "/api/scraping-jobs",
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: "Internal server error while retrieving jobs",
  })
  async listJobs(@CurrentUser("id") userId: string) {
    const requestId = crypto.randomUUID();

    this.logger.log("List jobs request received", {
      operation: "listJobs",
      requestId,
      userId,
      timestamp: new Date().toISOString(),
    });

    try {
      const jobs = await this.scrapingService.listJobs(userId);

      this.logger.log("Jobs retrieved successfully", {
        operation: "listJobs",
        requestId,
        userId,
        jobCount: jobs.length,
        timestamp: new Date().toISOString(),
      });

      return successResponse(jobs, "Jobs retrieved successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";

      this.logger.error(
        "Failed to retrieve jobs",
        {
          operation: "listJobs",
          requestId,
          userId,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
        errorStack,
      );

      // Delegate to global exception filter
      throw error;
    }
  }

  /**
   * Get details of a specific scraping job with all its items
   */
  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get scraping job details",
    description:
      "Retrieve detailed information about a specific scraping job, including all associated scraping items with extracted data. Only accessible by the job owner.",
  })
  @ApiResponse({
    status: 200,
    description: "Job details retrieved successfully",
    type: JobWithItemsDto,
    schema: {
      example: {
        statusCode: 200,
        success: true,
        message: "Job details retrieved successfully",
        data: {
          job: {
            id: "123e4567-e89b-12d3-a456-426614174000",
            userId: "987e6543-e21b-12d3-a456-426614174000",
            status: "processing",
            totalUrls: 10,
            processedUrls: 5,
            failedUrls: 1,
            createdAt: "2023-12-01T10:00:00.000Z",
            updatedAt: "2023-12-01T10:30:00.000Z",
          },
          items: [
            {
              id: "456e7890-e89b-12d3-a456-426614174000",
              jobId: "123e4567-e89b-12d3-a456-426614174000",
              url: "https://example.com/company",
              status: "completed",
              lastError: null,
              startedAt: "2023-12-01T10:05:00.000Z",
              finishedAt: "2023-12-01T10:06:00.000Z",
              companyName: "Acme Corporation",
              website: "https://www.acme.com",
              industry: "Technology",
              headcountRange: "100-500",
              hqLocation: "San Francisco, CA",
              contacts: [
                {
                  name: "John Smith",
                  title: "Chief Technology Officer",
                  email: "john.smith@acme.com",
                },
              ],
              rawData: { url: "https://example.com/company", htmlLength: 5000 },
              createdAt: "2023-12-01T10:00:00.000Z",
              updatedAt: "2023-12-01T10:06:00.000Z",
            },
          ],
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: "Invalid UUID format",
    schema: {
      example: {
        statusCode: 400,
        message: "Validation failed (uuid is expected)",
        timestamp: "2023-12-01T10:00:00.000Z",
        path: "/api/scraping-jobs/invalid-uuid",
      },
    },
  })
  @ApiNotFoundResponse({
    description: "Job not found or access denied",
    schema: {
      example: {
        statusCode: 404,
        message: "Job not found or you do not have access to this job",
        timestamp: "2023-12-01T10:00:00.000Z",
        path: "/api/scraping-jobs/123e4567-e89b-12d3-a456-426614174000",
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: "Invalid or missing authentication token",
    schema: {
      example: {
        statusCode: 401,
        message: "Invalid or expired token",
        timestamp: "2023-12-01T10:00:00.000Z",
        path: "/api/scraping-jobs/123e4567-e89b-12d3-a456-426614174000",
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: "Internal server error while retrieving job details",
  })
  async getJob(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser("id") userId: string,
  ) {
    const requestId = crypto.randomUUID();

    this.logger.log("Get job details request received", {
      operation: "getJob",
      requestId,
      userId,
      jobId: id,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await this.scrapingService.getJob(id, userId);

      this.logger.log("Job details retrieved successfully", {
        operation: "getJob",
        requestId,
        userId,
        jobId: id,
        itemCount: result.items.length,
        timestamp: new Date().toISOString(),
      });

      return successResponse(result, "Job details retrieved successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";

      this.logger.error(
        "Failed to retrieve job details",
        {
          operation: "getJob",
          requestId,
          userId,
          jobId: id,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
        errorStack,
      );

      // Delegate to global exception filter
      throw error;
    }
  }
}
