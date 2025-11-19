import { Injectable } from "@nestjs/common";
import { eq, lt, desc } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import { healthChecking } from "../schema/health-checking";
import { DrizzleService } from "../drizzle.service";

export interface CreateHealthCheckDto {
  service: string;
  status: string;
  message?: string;
  details?: any;
}

export interface HealthCheckRecord {
  id: number;
  service: string;
  status: string;
  message?: string;
  details?: any;
  checkedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class HealthCheckingRepository extends BaseRepository<HealthCheckRecord> {
  constructor(protected readonly drizzleService: DrizzleService) {
    super(drizzleService);
  }

  async create(data: CreateHealthCheckDto): Promise<HealthCheckRecord> {
    this.logger.log(
      `Creating health check record for service: ${data.service}`,
    );

    try {
      const result = await this.db
        .insert(healthChecking)
        .values({
          service: data.service,
          status: data.status,
          message: data.message,
          details: data.details,
        })
        .returning();

      this.logger.log(`Health check record created with ID: ${result[0].id}`);
      return result[0] as HealthCheckRecord;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Error creating health check record: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  async findById(id: number): Promise<HealthCheckRecord | null> {
    this.logger.log(`Finding health check record by ID: ${id}`);

    try {
      const result = await this.db
        .select()
        .from(healthChecking)
        .where(eq(healthChecking.id, id))
        .limit(1);

      const found = result.length > 0;
      this.logger.log(
        `Health check record ${found ? "found" : "not found"} with ID: ${id}`,
      );
      return found ? (result[0] as HealthCheckRecord) : null;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Error finding health check record by ID ${id}`,
        errorStack,
      );
      throw error;
    }
  }

  async findAll(limit = 100): Promise<HealthCheckRecord[]> {
    this.logger.log(`Finding all health check records (limit: ${limit})`);

    try {
      const result = await this.db
        .select()
        .from(healthChecking)
        .orderBy(desc(healthChecking.createdAt))
        .limit(limit);

      this.logger.log(`Found ${result.length} health check records`);
      return result as HealthCheckRecord[];
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error("Error finding all health check records", errorStack);
      throw error;
    }
  }

  async deleteById(id: number): Promise<boolean> {
    this.logger.log(`Deleting health check record with ID: ${id}`);

    try {
      const result = await this.db
        .delete(healthChecking)
        .where(eq(healthChecking.id, id))
        .returning();

      const deleted = result.length > 0;
      this.logger.log(
        `Health check record ${deleted ? "deleted" : "not found"} with ID: ${id}`,
      );
      return deleted;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Error deleting health check record with ID ${id}`,
        errorStack,
      );
      throw error;
    }
  }

  async deleteOlderThan(minutes: number): Promise<number> {
    this.logger.log(
      `Deleting health check records older than ${minutes} minutes`,
    );

    try {
      const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

      const result = await this.db
        .delete(healthChecking)
        .where(lt(healthChecking.createdAt, cutoffTime))
        .returning();

      this.logger.log(
        `Deleted ${result.length} health check records older than ${minutes} minutes`,
      );
      return result.length;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Error deleting old health check records: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  async deleteByService(service: string): Promise<number> {
    this.logger.log(`Deleting health check records for service: ${service}`);

    try {
      const result = await this.db
        .delete(healthChecking)
        .where(eq(healthChecking.service, service))
        .returning();

      this.logger.log(
        `Deleted ${result.length} health check records for service: ${service}`,
      );
      return result.length;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Error deleting health check records for service ${service}`,
        errorStack,
      );
      throw error;
    }
  }

  async getLatestByService(service: string): Promise<HealthCheckRecord | null> {
    this.logger.log(
      `Finding latest health check record for service: ${service}`,
    );

    try {
      const result = await this.db
        .select()
        .from(healthChecking)
        .where(eq(healthChecking.service, service))
        .orderBy(desc(healthChecking.createdAt))
        .limit(1);

      const found = result.length > 0;
      this.logger.log(
        `Latest health check record ${found ? "found" : "not found"} for service: ${service}`,
      );
      return found ? (result[0] as HealthCheckRecord) : null;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        `Error finding latest health check record for service ${service}`,
        errorStack,
      );
      throw error;
    }
  }

  async countRecords(): Promise<number> {
    return this.count(healthChecking);
  }

  async countByService(service: string): Promise<number> {
    return this.count(healthChecking, eq(healthChecking.service, service));
  }
}
