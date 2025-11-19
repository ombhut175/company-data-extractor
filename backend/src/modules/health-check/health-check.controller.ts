import { Controller, Get, Post, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { HealthCheckCronService } from "./health-check-cron.service";
import { HealthCheckingRepository } from "../../core/database/repositories";

@ApiTags("Health Check")
@Controller("health-check")
export class HealthCheckController {
  private readonly logger = new Logger(HealthCheckController.name);

  constructor(
    private readonly healthCheckCronService: HealthCheckCronService,
    private readonly healthCheckingRepository: HealthCheckingRepository,
  ) {}

  @Get("status")
  @ApiOperation({ summary: "Get health check status and statistics" })
  @ApiResponse({
    status: 200,
    description: "Health check status retrieved successfully",
    schema: {
      type: "object",
      properties: {
        message: { type: "string" },
        stats: {
          type: "object",
          properties: {
            totalRecords: { type: "number" },
            serviceRecords: { type: "number" },
            latestRecord: { type: "object", nullable: true },
            lastCheckAt: { type: "string", nullable: true },
          },
        },
        timestamp: { type: "string" },
      },
    },
  })
  async getHealthCheckStatus() {
    try {
      const stats = await this.healthCheckCronService.getHealthCheckStats();

      return {
        message: "Health check status retrieved successfully",
        stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Error getting health check status: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post("trigger")
  @ApiOperation({ summary: "Manually trigger health check cron job" })
  @ApiResponse({
    status: 200,
    description: "Health check triggered successfully",
    schema: {
      type: "object",
      properties: {
        message: { type: "string" },
        timestamp: { type: "string" },
      },
    },
  })
  async triggerHealthCheck() {
    try {
      this.logger.log("Manual health check trigger requested");

      await this.healthCheckCronService.triggerHealthCheck();

      return {
        message: "Health check triggered successfully",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Error triggering health check: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Post("test-cron")
  @ApiOperation({ summary: "Test the cron job function with detailed results" })
  @ApiResponse({
    status: 200,
    description: "Cron job function tested successfully with detailed results",
    schema: {
      type: "object",
      properties: {
        message: { type: "string" },
        success: { type: "boolean" },
        executionTime: { type: "number" },
        results: {
          type: "object",
          properties: {
            recordsBeforeCleanup: { type: "number" },
            recordsAfterCleanup: { type: "number" },
            newRecordId: { type: "number" },
            deletedCount: { type: "number" },
            newRecord: { type: "object" },
          },
        },
        timestamp: { type: "string" },
        duration: { type: "string" },
      },
    },
  })
  async testCronJobFunction() {
    const startTime = Date.now();
    this.logger.log("Testing cron job function directly");

    try {
      // Get initial count
      const initialCount = await this.healthCheckingRepository.countRecords();
      this.logger.log(`Initial record count: ${initialCount}`);

      // Execute the cron job function and get detailed results
      const results = await this.healthCheckCronService.testCronJobExecution();

      // Get final count
      const finalCount = await this.healthCheckingRepository.countRecords();
      this.logger.log(`Final record count: ${finalCount}`);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      const response = {
        message: "Cron job function executed successfully",
        success: true,
        executionTime,
        results: {
          ...results,
          recordsBeforeCleanup: initialCount,
          recordsAfterCleanup: finalCount,
        },
        timestamp: new Date().toISOString(),
        duration: `${executionTime}ms`,
      };

      this.logger.log(`Cron job test completed in ${executionTime}ms`);
      return response;
    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";

      this.logger.error(
        `Error testing cron job function: ${errorMessage}`,
        errorStack,
      );

      return {
        message: "Cron job function test failed",
        success: false,
        executionTime,
        error: {
          message: errorMessage,
          stack: errorStack,
        },
        timestamp: new Date().toISOString(),
        duration: `${executionTime}ms`,
      };
    }
  }

  @Get("records")
  @ApiOperation({ summary: "Get recent health check records" })
  @ApiResponse({
    status: 200,
    description: "Health check records retrieved successfully",
    schema: {
      type: "object",
      properties: {
        message: { type: "string" },
        records: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "number" },
              service: { type: "string" },
              status: { type: "string" },
              message: { type: "string", nullable: true },
              details: { type: "object", nullable: true },
              checkedAt: { type: "string" },
              createdAt: { type: "string" },
              updatedAt: { type: "string" },
            },
          },
        },
        count: { type: "number" },
        timestamp: { type: "string" },
      },
    },
  })
  async getHealthCheckRecords() {
    try {
      const records = await this.healthCheckingRepository.findAll(50); // Get last 50 records

      return {
        message: "Health check records retrieved successfully",
        records,
        count: records.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Error getting health check records: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
