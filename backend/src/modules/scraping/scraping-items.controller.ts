import {
  Controller,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiInternalServerErrorResponse,
} from "@nestjs/swagger";
import { AuthGuard } from "../../common/guards/auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ScrapingService } from "./services/scraping.service";
import { ScrapingItemDto } from "./dto/scraping-responses.dto";
import { successResponse } from "../../common/helpers/api-response.helper";

/**
 * Controller for managing scraping items
 * All endpoints require authentication via AuthGuard
 */
@ApiTags("Scraping Items")
@Controller("scraping-items")
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ScrapingItemsController {
  private readonly logger = new Logger(ScrapingItemsController.name);

  constructor(private readonly scrapingService: ScrapingService) {}

  /**
   * List all scraping items across all jobs for the authenticated user
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "List all scraping items",
    description:
      "Retrieve a list of all scraping items from all jobs created by the authenticated user, ordered by creation date (newest first). Includes extracted company data and contact information.",
  })
  @ApiResponse({
    status: 200,
    description: "Items retrieved successfully",
    type: [ScrapingItemDto],
    schema: {
      example: {
        statusCode: 200,
        success: true,
        message: "Items retrieved successfully",
        data: [
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
  })
  @ApiUnauthorizedResponse({
    description: "Invalid or missing authentication token",
    schema: {
      example: {
        statusCode: 401,
        message: "Invalid or expired token",
        timestamp: "2023-12-01T10:00:00.000Z",
        path: "/api/scraping-items",
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: "Internal server error while retrieving items",
  })
  async listItems(@CurrentUser("id") userId: string) {
    const requestId = crypto.randomUUID();

    this.logger.log("List items request received", {
      operation: "listItems",
      requestId,
      userId,
      timestamp: new Date().toISOString(),
    });

    try {
      const items = await this.scrapingService.listItems(userId);

      this.logger.log("Items retrieved successfully", {
        operation: "listItems",
        requestId,
        userId,
        itemCount: items.length,
        timestamp: new Date().toISOString(),
      });

      return successResponse(items, "Items retrieved successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";

      this.logger.error(
        "Failed to retrieve items",
        {
          operation: "listItems",
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
}
