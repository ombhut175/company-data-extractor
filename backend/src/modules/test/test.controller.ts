import { Controller, Get, UseGuards, Logger } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { SupabaseService } from "../../core/supabase/supabase.service";
import { TestService } from "./test.service";
import { successResponse } from "../../common/helpers/api-response.helper";
import { AuthGuard, CurrentUser } from "../../common";

@ApiTags("test")
@Controller("test")
export class TestController {
  private readonly logger = new Logger(TestController.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly testService: TestService,
  ) {}

  //#region ==================== SUPABASE TESTS ====================

  @Get("supabase-status")
  @ApiOperation({ summary: "Check Supabase connection status" })
  @ApiResponse({
    status: 200,
    description: "Supabase connection status checked successfully",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 200 },
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Supabase connection status checked successfully",
        },
        data: {
          type: "object",
          properties: {
            connected: { type: "boolean", example: true },
            timestamp: { type: "string", example: "2023-01-01T00:00:00Z" },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 500, description: "Supabase connection failed" })
  checkSupabaseStatus() {
    this.logger.log("Checking Supabase connection status...");

    try {
      const client = this.supabaseService.getClient();
      // Simple test to check if client is available
      const status = {
        connected: !!client,
        timestamp: new Date().toISOString(),
      };

      this.logger.log(
        `Supabase connection status: ${status.connected ? "Connected" : "Disconnected"}`,
      );

      return successResponse(
        status,
        "Supabase connection status checked successfully",
      );
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        "Failed to check Supabase connection status",
        errorStack,
      );
      throw error;
    }
  }

  //#endregion

  //#region ==================== DATABASE TESTS ====================

  @Get("database-status")
  @ApiOperation({ summary: "Check database infrastructure status" })
  @ApiResponse({
    status: 200,
    description: "Database infrastructure status checked successfully",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 200 },
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Database infrastructure is ready",
        },
        data: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example:
                "Database connection service is configured and ready to use when models are created",
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: "Database infrastructure check failed",
  })
  checkDatabaseStatus() {
    this.logger.log("Checking database infrastructure status...");

    try {
      const result = this.testService.testDatabaseConnection();
      this.logger.log(
        "Database infrastructure status check completed successfully",
      );
      return successResponse(result.data, result.message);
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        "Database infrastructure status check failed",
        errorStack,
      );
      throw error;
    }
  }

  @Get("health-check-db")
  @ApiOperation({
    summary: "Test health_checking table by adding and removing a record",
  })
  @ApiResponse({
    status: 200,
    description: "Health check table test completed successfully",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 200 },
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Health check table test completed successfully",
        },
        data: {
          type: "object",
          properties: {
            recordId: { type: "number", example: 1 },
            operations: {
              type: "object",
              properties: {
                insert: { type: "string", example: "successful" },
                delete: { type: "string", example: "successful" },
                verification: { type: "string", example: "successful" },
              },
            },
            timestamp: { type: "string", example: "2023-01-01T00:00:00.000Z" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: "Health check table test failed",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 500 },
        success: { type: "boolean", example: false },
        message: { type: "string", example: "Health check table test failed" },
        data: {
          type: "object",
          properties: {
            error: { type: "string", example: "Database connection error" },
            timestamp: { type: "string", example: "2023-01-01T00:00:00.000Z" },
          },
        },
      },
    },
  })
  async testHealthCheckTable() {
    this.logger.log("Starting health check table test...");

    try {
      const result = await this.testService.testHealthCheckTable();
      this.logger.log("Health check table test completed successfully");
      return successResponse(result.data, result.message);
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error("Health check table test failed", errorStack);
      throw error;
    }
  }

  //#endregion

  //#region ==================== FRONTEND TESTING ENDPOINT ====================

  @Get("testing")
  @ApiOperation({ summary: "Testing endpoint for frontend integration" })
  @ApiResponse({
    status: 200,
    description: "Testing data retrieved successfully",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 200 },
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Testing data retrieved successfully",
        },
        data: {
          type: "object",
          properties: {
            timestamp: { type: "string", example: "2023-01-01T00:00:00Z" },
            environment: { type: "string", example: "development" },
            version: { type: "string", example: "1.0.0" },
            features: {
              type: "array",
              items: { type: "string" },
              example: ["auth", "database", "api"],
            },
            stats: {
              type: "object",
              properties: {
                uptime: { type: "number", example: 12345 },
                requests: { type: "number", example: 150 },
                users: { type: "number", example: 25 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 500, description: "Failed to retrieve testing data" })
  getTestingData() {
    this.logger.log("Retrieving testing data for frontend integration...");

    try {
      const testingData = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        version: "1.0.0",
        features: ["auth", "database", "api", "supabase"],
        stats: {
          uptime: Math.floor(process.uptime()),
          requests: Math.floor(Math.random() * 1000) + 100,
          users: Math.floor(Math.random() * 100) + 10,
        },
      };

      this.logger.log(
        `Testing data retrieved successfully - Environment: ${testingData.environment}, Uptime: ${testingData.stats.uptime}s`,
      );

      return successResponse(
        testingData,
        "Testing data retrieved successfully",
      );
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error("Failed to retrieve testing data", errorStack);
      throw error;
    }
  }

  //#endregion

  //#region ==================== AUTH GUARD TESTS ====================

  @Get("auth/profile")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Test AuthGuard - Get current user profile",
    description:
      "Protected endpoint that requires valid Bearer token. Demonstrates AuthGuard usage.",
  })
  @ApiResponse({
    status: 200,
    description: "User profile retrieved successfully",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 200 },
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "User profile retrieved successfully",
        },
        data: {
          type: "object",
          properties: {
            id: {
              type: "string",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            email: { type: "string", example: "user@example.com" },
            authenticated: { type: "boolean", example: true },
            timestamp: { type: "string", example: "2023-01-01T00:00:00Z" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing token",
  })
  getAuthenticatedProfile(@CurrentUser() user: any) {
    this.logger.log("Authenticated user accessing profile", {
      operation: "getAuthenticatedProfile",
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    const profileData = {
      id: user.id,
      email: user.email,
      authenticated: true,
      timestamp: new Date().toISOString(),
    };

    return successResponse(profileData, "User profile retrieved successfully");
  }

  @Get("auth/user-id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Test AuthGuard - Get only user ID",
    description:
      'Protected endpoint that extracts only user ID using @CurrentUser("id") decorator.',
  })
  @ApiResponse({
    status: 200,
    description: "User ID retrieved successfully",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 200 },
        success: { type: "boolean", example: true },
        message: { type: "string", example: "User ID retrieved successfully" },
        data: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              example: "123e4567-e89b-12d3-a456-426614174000",
            },
            extractedAt: { type: "string", example: "2023-01-01T00:00:00Z" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing token",
  })
  getUserId(@CurrentUser("id") userId: string) {
    this.logger.log("User ID extracted successfully", {
      operation: "getUserId",
      userId,
      timestamp: new Date().toISOString(),
    });

    const responseData = {
      userId,
      extractedAt: new Date().toISOString(),
    };

    return successResponse(responseData, "User ID retrieved successfully");
  }

  @Get("auth/full-user")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Test AuthGuard - Get full Supabase user object",
    description:
      "Protected endpoint that returns complete user information from Supabase.",
  })
  @ApiResponse({
    status: 200,
    description: "Full user data retrieved successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing token",
  })
  getFullUser(@CurrentUser() user: any) {
    this.logger.log("Full user data requested", {
      operation: "getFullUser",
      userId: user.id,
      email: user.email,
      hasSupabaseUser: !!user.supabaseUser,
      timestamp: new Date().toISOString(),
    });

    const fullUserData = {
      basic: {
        id: user.id,
        email: user.email,
      },
      supabase: user.supabaseUser,
      requestedAt: new Date().toISOString(),
    };

    return successResponse(
      fullUserData,
      "Full user data retrieved successfully",
    );
  }

  //#endregion
}
