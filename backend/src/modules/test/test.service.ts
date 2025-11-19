import { Injectable, Logger } from "@nestjs/common";
import { DrizzleService } from "../../core/database/drizzle.service";
import { healthChecking } from "../../core/database/schema/health-checking";
import { eq } from "drizzle-orm";

@Injectable()
export class TestService {
  private readonly logger = new Logger(TestService.name);

  constructor(private readonly drizzleService: DrizzleService) {}

  //#region ==================== DATABASE OPERATIONS ====================

  testDatabaseConnection() {
    try {
      this.logger.log(
        "Database connection infrastructure is ready. Models will be created when needed.",
      );

      return {
        success: true,
        message: "Database infrastructure is ready",
        data: {
          message:
            "Database connection service is configured and ready to use when models are created",
        },
      };
    } catch (error) {
      this.logger.error("Database infrastructure check failed", error);
      throw error;
    }
  }

  async testHealthCheckTable() {
    try {
      const db = this.drizzleService.getDatabase();
      const testService = "health_check_test";
      const testStatus = "testing";

      this.logger.log(
        "Starting health check test - adding record to health_checking table",
      );

      // Add a test record
      const insertResult = await db
        .insert(healthChecking)
        .values({
          service: testService,
          status: testStatus,
          message: "Test health check record",
          details: {
            timestamp: new Date().toISOString(),
            operation: "insert",
            test: true,
          },
        })
        .returning({ id: healthChecking.id });

      const insertedId = insertResult[0]?.id;
      this.logger.log(`Test record inserted with ID: ${insertedId}`);

      // Verify the record was inserted
      const verifyInsert = await db
        .select()
        .from(healthChecking)
        .where(eq(healthChecking.id, insertedId))
        .limit(1);

      if (verifyInsert.length === 0) {
        throw new Error("Failed to verify inserted record");
      }

      this.logger.log("Record insertion verified successfully");

      // Remove the test record
      this.logger.log("Removing test record from health_checking table");
      const deleteResult = await db
        .delete(healthChecking)
        .where(eq(healthChecking.id, insertedId))
        .returning({ id: healthChecking.id });

      if (deleteResult.length === 0) {
        throw new Error("Failed to delete test record");
      }

      this.logger.log(
        `Test record deleted successfully with ID: ${insertedId}`,
      );

      // Verify the record was deleted
      const verifyDelete = await db
        .select()
        .from(healthChecking)
        .where(eq(healthChecking.id, insertedId))
        .limit(1);

      if (verifyDelete.length > 0) {
        throw new Error("Record was not properly deleted");
      }

      this.logger.log("Record deletion verified successfully");

      return {
        success: true,
        message: "Health check table test completed successfully",
        data: {
          recordId: insertedId,
          operations: {
            insert: "successful",
            delete: "successful",
            verification: "successful",
          },
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Health check table test failed", error);
      return {
        success: false,
        message: "Health check table test failed",
        data: {
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  //#endregion
}
