import { Logger } from "@nestjs/common";
import Redis from "ioredis";

const logger = new Logger("RedisConfig");

export function createRedisConnection(): Redis {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  try {
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: false,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err: Error) => {
        const targetError = "READONLY";
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    redis.on("connect", () => {
      logger.log("Redis connected successfully");
    });

    redis.on("error", (err) => {
      logger.error(`Redis connection error: ${err.message}`);
    });

    redis.on("reconnecting", () => {
      logger.warn("Redis reconnecting...");
    });

    return redis;
  } catch (error) {
    logger.error(
      `Failed to create Redis connection: ${error instanceof Error ? error.message : error}`,
    );
    throw error;
  }
}

export const redisProvider = {
  provide: "REDIS",
  useFactory: createRedisConnection,
};
