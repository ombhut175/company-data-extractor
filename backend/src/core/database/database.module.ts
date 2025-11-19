import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { DrizzleService } from "./drizzle.service";
import { UsersRepository } from "./repositories/users.repository";
import { HealthCheckingRepository } from "./repositories/health-checking.repository";

@Module({
  imports: [ConfigModule],
  providers: [DrizzleService, UsersRepository, HealthCheckingRepository],
  exports: [DrizzleService, UsersRepository, HealthCheckingRepository],
})
export class DatabaseModule {}
