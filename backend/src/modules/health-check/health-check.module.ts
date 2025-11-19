import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { DatabaseModule } from "../../core/database/database.module";
import { HealthCheckCronService } from "./health-check-cron.service";
import { HealthCheckController } from "./health-check.controller";

@Module({
  imports: [ScheduleModule.forRoot(), DatabaseModule],
  controllers: [HealthCheckController],
  providers: [HealthCheckCronService],
  exports: [HealthCheckCronService],
})
export class HealthCheckModule {}
