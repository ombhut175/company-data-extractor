import { BullModule } from "@nestjs/bullmq";
import { BullBoardModule } from "@bull-board/nestjs";
import { ExpressAdapter } from "@bull-board/express";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const bullMQConfig = BullModule.forRoot({
  connection: {
    url: redisUrl,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    enableOfflineQueue: false,
  },
});

export const bullBoardConfig = BullBoardModule.forRoot({
  route: "/queues",
  adapter: ExpressAdapter,
});
