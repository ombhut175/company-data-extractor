import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { HealthCheckingRepository } from "../../core/database/repositories";

@Injectable()
export class HealthCheckCronService {
  private readonly logger = new Logger(HealthCheckCronService.name);
  private readonly SERVICE_NAME = "cron-health-check";

  constructor(
    private readonly healthCheckingRepository: HealthCheckingRepository,
  ) {}

  /**
   * Runs every 12 minutes
   * Cron expression: '0 *\/12 * * * *' means at minute 0, 12, 24, 36, 48 of every hour
   */
  @Cron("0 */12 * * * *", {
    name: "health-check-cron",
    timeZone: "UTC",
  })
  async handleHealthCheckCron() {
    const startTime = Date.now();
    this.logger.log("Health check cron job started");

    try {
      // Step 1: Add a new health check record
      const newRecord = await this.addHealthCheckRecord();

      // Step 2: Clean up old records (keep only records from last 2 hours for example)
      const deletedCount = await this.cleanupOldRecords();

      const endTime = Date.now();
      const duration = endTime - startTime;

      this.logger.log(
        `Health check cron job completed successfully in ${duration}ms. ` +
          `Added record ID: ${newRecord.id}, Deleted ${deletedCount} old records.`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Health check cron job failed: ${errorMessage}`,
        errorStack,
      );

      // Try to log the failure as a health check record
      try {
        await this.healthCheckingRepository.create({
          service: this.SERVICE_NAME,
          status: "ERROR",
          message: `Cron job failed: ${errorMessage}`,
          details: {
            error: errorMessage,
            stack: errorStack,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (logError) {
        const logErrorMessage =
          logError instanceof Error ? logError.message : "Unknown error";
        this.logger.error(`Failed to log cron job error: ${logErrorMessage}`);
      }
    }
  }

  /**
   * Add a new health check record
   */
  private async addHealthCheckRecord() {
    const systemInfo = this.getSystemInfo();

    const record = await this.healthCheckingRepository.create({
      service: this.SERVICE_NAME,
      status: "HEALTHY",
      message: "Automated health check completed successfully",
      details: {
        timestamp: new Date().toISOString(),
        systemInfo,
        cronJobType: "scheduled-health-check",
      },
    });

    this.logger.log(`Created health check record with ID: ${record.id}`);
    return record;
  }

  /**
   * Clean up old health check records
   * Keeps records from the last 2 hours, deletes older ones
   */
  private async cleanupOldRecords(): Promise<number> {
    const RETENTION_MINUTES = 120; // 2 hours

    const deletedCount =
      await this.healthCheckingRepository.deleteOlderThan(RETENTION_MINUTES);

    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} old health check records`);
    } else {
      this.logger.log("No old health check records to clean up");
    }

    return deletedCount;
  }

  /**
   * Get basic system information for the health check
   */
  private getSystemInfo() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: `${Math.floor(uptime / 60)} minutes`,
      memoryUsage: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Manual trigger for testing purposes
   */
  async triggerHealthCheck(): Promise<void> {
    this.logger.log("Manual health check triggered");
    await this.handleHealthCheckCron();
  }

  /**
   * Test the cron job execution and return detailed results
   */
  async testCronJobExecution(): Promise<{
    newRecordId: number;
    newRecord: any;
    deletedCount: number;
    systemInfo: any;
    executionDetails: {
      addRecordTime: number;
      cleanupTime: number;
      totalTime: number;
    };
  }> {
    const startTime = Date.now();
    this.logger.log("Testing cron job execution with detailed results");

    try {
      // Step 1: Add a new health check record
      const addStartTime = Date.now();
      const newRecord = await this.addHealthCheckRecord();
      const addEndTime = Date.now();
      const addRecordTime = addEndTime - addStartTime;

      // Step 2: Clean up old records
      const cleanupStartTime = Date.now();
      const deletedCount = await this.cleanupOldRecords();
      const cleanupEndTime = Date.now();
      const cleanupTime = cleanupEndTime - cleanupStartTime;

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const systemInfo = this.getSystemInfo();

      const results = {
        newRecordId: newRecord.id,
        newRecord: {
          id: newRecord.id,
          service: newRecord.service,
          status: newRecord.status,
          message: newRecord.message,
          details: newRecord.details,
          createdAt: newRecord.createdAt,
        },
        deletedCount,
        systemInfo,
        executionDetails: {
          addRecordTime,
          cleanupTime,
          totalTime,
        },
      };

      this.logger.log(
        `Test execution completed successfully in ${totalTime}ms. ` +
          `Added record ID: ${newRecord.id}, Deleted ${deletedCount} old records.`,
      );

      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(`Test execution failed: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  /**
   * Get current health check statistics
   */
  async getHealthCheckStats() {
    try {
      const totalRecords = await this.healthCheckingRepository.countRecords();
      const serviceRecords = await this.healthCheckingRepository.countByService(
        this.SERVICE_NAME,
      );
      const latestRecord =
        await this.healthCheckingRepository.getLatestByService(
          this.SERVICE_NAME,
        );

      return {
        totalRecords,
        serviceRecords,
        latestRecord,
        lastCheckAt: latestRecord?.checkedAt || null,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Error getting health check stats: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
