import { Injectable, Logger } from "@nestjs/common";
import { DrizzleService } from "../drizzle.service";
import { NotFoundException } from "@nestjs/common";
import { MESSAGES } from "../../../common/constants/string-const";
import { eq, count } from "drizzle-orm";

@Injectable()
export abstract class BaseRepository<T> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly drizzleService: DrizzleService) {}

  protected get db() {
    return this.drizzleService.getDatabase();
  }

  protected get pool() {
    return this.drizzleService.getPool();
  }

  /**
   * Find a record by ID or throw NotFoundException
   */
  protected async findByIdOrThrow(
    table: any,
    id: string | number,
    errorMessage = MESSAGES.NOT_FOUND,
  ): Promise<T> {
    this.logger.log(`Finding record by ID: ${id}`);

    try {
      const result = await this.db
        .select()
        .from(table)
        .where(eq(table.id, id))
        .limit(1);

      if (!result.length) {
        this.logger.warn(`Record not found with ID: ${id}`);
        throw new NotFoundException(errorMessage);
      }

      this.logger.log(`Record found successfully with ID: ${id}`);
      return result[0] as T;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(`Error finding record by ID ${id}`, errorStack);
      throw error;
    }
  }

  /**
   * Find a record by custom condition or throw NotFoundException
   */
  protected async findOneOrThrow(
    table: any,
    condition: any,
    errorMessage = MESSAGES.NOT_FOUND,
  ): Promise<T> {
    this.logger.log("Finding record with custom condition");

    try {
      const result = await this.db
        .select()
        .from(table)
        .where(condition)
        .limit(1);

      if (!result.length) {
        this.logger.warn("Record not found with custom condition");
        throw new NotFoundException(errorMessage);
      }

      this.logger.log("Record found successfully with custom condition");
      return result[0] as T;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        "Error finding record with custom condition",
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Find a record by custom condition (returns null if not found)
   */
  protected async findOne(table: any, condition: any): Promise<T | null> {
    this.logger.log("Finding record with custom condition (nullable)");

    try {
      const result = await this.db
        .select()
        .from(table)
        .where(condition)
        .limit(1);
      const found = result.length > 0;
      this.logger.log(
        `Record ${found ? "found" : "not found"} with custom condition`,
      );
      return result.length ? (result[0] as T) : null;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(
        "Error finding record with custom condition",
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Count records with optional where condition
   */
  protected async count(table: any, where?: any): Promise<number> {
    this.logger.log(`Counting records${where ? " with condition" : ""}`);

    try {
      let query = this.db.select({ count: count() }).from(table);

      if (where) {
        query = (query as any).where(where);
      }

      const result = await query;
      const recordCount = result[0]?.count || 0;
      this.logger.log(`Found ${recordCount} records`);
      return recordCount;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error("Error counting records", errorStack);
      throw error;
    }
  }

  /**
   * Check if a record exists
   */
  protected async exists(table: any, condition: any): Promise<boolean> {
    const result = await this.db
      .select({ count: count() })
      .from(table)
      .where(condition)
      .limit(1);
    return (result[0]?.count || 0) > 0;
  }

  /**
   * Execute raw SQL query
   */
  protected async executeRaw<T = any>(
    query: string,
    params?: any[],
  ): Promise<T[]> {
    const result = await this.pool.query(query, params);
    return result.rows;
  }
}
