import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { BullModule } from "@nestjs/bullmq";
import { BullBoardModule } from "@bull-board/nestjs";
import { ExpressAdapter } from "@bull-board/express";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { SupabaseModule } from "./core/supabase/supabase.module";
import { DatabaseModule } from "./core/database/database.module";
import { TestModule } from "./modules/test/test.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthCheckModule } from "./modules/health-check/health-check.module";
import { QueuesModule } from "./modules/queues/queues.module";
import { envValidationSchema } from "./config/env.validation";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    BullModule.forRoot({
      connection: {
        url: redisUrl,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        enableOfflineQueue: false,
      },
    }),
    BullBoardModule.forRoot({
      route: "/admin/queues",
      adapter: ExpressAdapter,
    }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    DatabaseModule,
    TestModule,
    AuthModule,
    HealthCheckModule,
    QueuesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
