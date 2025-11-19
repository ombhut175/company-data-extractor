import { Controller, Get, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { successResponse } from "./common/helpers/api-response.helper";

@ApiTags("app")
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: "Get hello message" })
  @ApiResponse({
    status: 200,
    description: "Hello message retrieved successfully",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 200 },
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Hello message retrieved successfully",
        },
        data: { type: "string", example: "Hello World!" },
      },
    },
  })
  public getHello(): unknown {
    this.logger.log("Hello endpoint called");

    try {
      const message = this.appService.getHello();
      this.logger.log("Hello message retrieved successfully");
      return successResponse(message, "Hello message retrieved successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.stack : "Unknown error";
      this.logger.error("Failed to get hello message", errorMessage);
      throw error;
    }
  }
}
