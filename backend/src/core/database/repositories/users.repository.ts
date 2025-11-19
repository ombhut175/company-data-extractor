import { Injectable } from "@nestjs/common";
import { BaseRepository } from "./base.repository";
import { users } from "../schema/users";
import { eq } from "drizzle-orm";
import { MESSAGES } from "../../../common/constants/string-const";

export interface CreateUserDto {
  id?: string; // UUID id (optional, will be auto-generated if not provided)
  email: string;
  isEmailVerified?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  isEmailVerified?: boolean;
}

export interface UserEntity {
  id: string; // UUID
  email: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersRepository extends BaseRepository<UserEntity> {
  //#region ==================== CRUD OPERATIONS ====================

  async create(userData: CreateUserDto): Promise<UserEntity> {
    this.logger.log(`Creating user with email: ${userData.email}`);

    try {
      const result = await this.db
        .insert(users)
        .values({
          id: userData.id, // Use provided UUID or let DB generate one
          email: userData.email,
          isEmailVerified: userData.isEmailVerified || false,
        })
        .returning();

      this.logger.log(
        `User created successfully: ${userData.email} (ID: ${result[0].id})`,
      );
      return result[0] as UserEntity;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(`Failed to create user: ${userData.email}`, errorStack);
      throw error;
    }
  }

  async findById(id: string): Promise<UserEntity | null> {
    this.logger.log(`Finding user by ID: ${id}`);
    const result = await this.findOne(users, eq(users.id, id));
    if (result) {
      this.logger.log(`User found: ${result.email} (ID: ${id})`);
    } else {
      this.logger.log(`User not found with ID: ${id}`);
    }
    return result;
  }

  async findByIdOrThrow(id: string): Promise<UserEntity> {
    return super.findByIdOrThrow(users, id, MESSAGES.USER_NOT_FOUND);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    this.logger.log(`Finding user by email: ${email}`);
    const result = await this.findOne(users, eq(users.email, email));
    if (result) {
      this.logger.log(`User found with email: ${email} (ID: ${result.id})`);
    } else {
      this.logger.log(`User not found with email: ${email}`);
    }
    return result;
  }

  async findByEmailOrThrow(email: string): Promise<UserEntity> {
    this.logger.log(`Finding user by email (throw if not found): ${email}`);
    return this.findOneOrThrow(
      users,
      eq(users.email, email),
      MESSAGES.USER_NOT_FOUND,
    );
  }

  async update(id: string, userData: UpdateUserDto): Promise<UserEntity> {
    this.logger.log(`Updating user: ${id}`);

    try {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (userData.email !== undefined) {
        updateData.email = userData.email;
      }

      if (userData.isEmailVerified !== undefined) {
        updateData.isEmailVerified = userData.isEmailVerified;
      }

      const result = await this.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      if (!result.length) {
        this.logger.warn(`User not found for update: ${id}`);
        throw new Error(MESSAGES.USER_NOT_FOUND);
      }

      this.logger.log(`User updated successfully: ${id}`);
      return result[0] as UserEntity;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(`Failed to update user: ${id}`, errorStack);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting user: ${id}`);

    try {
      const result = await this.db
        .delete(users)
        .where(eq(users.id, id))
        .returning();

      if (!result.length) {
        this.logger.warn(`User not found for deletion: ${id}`);
        throw new Error(MESSAGES.USER_NOT_FOUND);
      }

      this.logger.log(`User deleted successfully: ${id}`);
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(`Failed to delete user: ${id}`, errorStack);
      throw error;
    }
  }

  //#endregion

  //#region ==================== VERIFICATION OPERATIONS ====================

  async markEmailAsVerified(email: string): Promise<UserEntity> {
    this.logger.log(`Marking email as verified: ${email}`);

    try {
      const result = await this.db
        .update(users)
        .set({
          isEmailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.email, email))
        .returning();

      if (!result.length) {
        this.logger.warn(`User not found for email verification: ${email}`);
        throw new Error(MESSAGES.USER_NOT_FOUND);
      }

      this.logger.log(`Email verified successfully: ${email}`);
      return result[0] as UserEntity;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error(`Failed to verify email: ${email}`, errorStack);
      throw error;
    }
  }

  async isEmailVerified(email: string): Promise<boolean> {
    this.logger.log(`Checking email verification status: ${email}`);
    const user = await this.findByEmail(email);
    const verified = user?.isEmailVerified || false;
    this.logger.log(`Email verification status for ${email}: ${verified}`);
    return verified;
  }

  //#endregion

  //#region ==================== UTILITY OPERATIONS ====================

  async emailExists(email: string): Promise<boolean> {
    this.logger.log(`Checking if email exists: ${email}`);
    const exists = await this.exists(users, eq(users.email, email));
    this.logger.log(`Email exists check for ${email}: ${exists}`);
    return exists;
  }

  async getAllUsers(): Promise<UserEntity[]> {
    this.logger.log("Fetching all users");
    try {
      const userList = await this.db.select().from(users);
      this.logger.log(`Retrieved ${userList.length} users`);
      return userList;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : "";
      this.logger.error("Failed to fetch all users", errorStack);
      throw error;
    }
  }

  async getUsersCount(): Promise<number> {
    this.logger.log("Counting total users");
    return this.count(users);
  }

  //#endregion
}
