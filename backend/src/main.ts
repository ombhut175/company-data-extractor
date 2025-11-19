// Load environment variables FIRST, before any other imports
import { loadEnvironment } from "./config/env.loader";
loadEnvironment();

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import basicAuth from "express-basic-auth";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ENV } from "./common/constants/string-const";
import cookieParser from "cookie-parser";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  try {
    logger.log("Starting application bootstrap...");
    const app = await NestFactory.create(AppModule);

    // Global prefix
    app.setGlobalPrefix("api");
    logger.log('Global prefix set to "api"');

    // Cookie parser middleware
    app.use(cookieParser());
    logger.log("Cookie parser middleware enabled");

    // Global CORS
    const nodeEnv = process.env[ENV.NODE_ENV] ?? "development";
    const isProd = nodeEnv === "production";

    logger.log(`Environment: ${nodeEnv}`);

    if (nodeEnv === "development") {
      // Allow all origins in development (echoes request origin, supports credentials)
      app.enableCors({
        origin: true,
        credentials: true,
      });
      logger.log("CORS enabled for development (allow all origins)");
    } else if (isProd) {
      // Restrict to FRONTEND_URL in production
      const frontendUrl = process.env[ENV.FRONTEND_URL];
      if (!frontendUrl) {
        logger.error("FRONTEND_URL must be set when NODE_ENV=production");
        throw new Error("FRONTEND_URL must be set when NODE_ENV=production");
      }
      app.enableCors({
        origin: frontendUrl,
        credentials: true,
      });
      logger.log(`CORS enabled for production (origin: ${frontendUrl})`);
    } else {
      // For other environments, default to FRONTEND_URL if provided, otherwise throw
      const frontendUrl = process.env[ENV.FRONTEND_URL];
      if (!frontendUrl) {
        logger.error(`FRONTEND_URL must be set when NODE_ENV=${nodeEnv}`);
        throw new Error(`FRONTEND_URL must be set when NODE_ENV=${nodeEnv}`);
      }
      app.enableCors({
        origin: frontendUrl,
        credentials: true,
      });
      logger.log(`CORS enabled for ${nodeEnv} (origin: ${frontendUrl})`);
    }

    // Global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());
    logger.log("Global exception filter applied");

    // Swagger configuration (only in non-production environments unless explicitly disabled)
    const swaggerEnabled =
      (process.env[ENV.SWAGGER_ENABLED] ?? "true") === "true";
    if (!isProd && swaggerEnabled) {
      logger.log("Setting up Swagger documentation...");

      const swaggerUser = process.env[ENV.SWAGGER_USER];
      const swaggerPassword = process.env[ENV.SWAGGER_PASSWORD];

      // Optional basic auth protection for Swagger UI if credentials provided
      if (swaggerUser && swaggerPassword) {
        app.use(
          ["/api/docs", "/api-json"],
          basicAuth({
            users: { [swaggerUser]: swaggerPassword },
            challenge: true,
          }),
        );
        logger.log("Basic auth protection enabled for Swagger");
      }

      const config = new DocumentBuilder()
        .setTitle("Backend API Documentation")
        .setDescription("API description for the backend service")
        .setVersion("1.0")
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(app, config);

      // UI configuration to improve developer experience
      const deepLinking =
        (process.env[ENV.SWAGGER_UI_DEEP_LINKING] ?? "true") === "true";
      const docExpansion = (process.env[ENV.SWAGGER_UI_DOC_EXPANSION] ??
        "none") as "list" | "full" | "none";
      const filterEnv = process.env[ENV.SWAGGER_UI_FILTER];
      const filter =
        filterEnv === undefined
          ? true
          : filterEnv === "true"
            ? true
            : filterEnv === "false"
              ? false
              : filterEnv;

      SwaggerModule.setup("api/docs", app, document, {
        swaggerOptions: {
          deepLinking,
          docExpansion,
          filter,
          displayRequestDuration: true,
          tryItOutEnabled: true,
          tagsSorter: "alpha",
          operationsSorter: "alpha",
          defaultModelsExpandDepth: -1,
        },
        customSiteTitle: "Backend API Docs",
      });

      logger.log("Swagger documentation setup completed");
    } else {
      logger.log("Swagger documentation disabled");
    }

    const port = process.env[ENV.PORT] || 3000;

    // Enable shutdown hooks to ensure graceful shutdown and close Redis connections
    app.enableShutdownHooks();

    await app.listen(port, "0.0.0.0");

    console.log(`🚀 Application is running on: http://localhost:${port}`);
    if (!isProd && swaggerEnabled) {
      console.log(
        `📚 Swagger documentation available at: http://localhost:${port}/api/docs`,
      );
    }
    logger.log("Bootstrap completed successfully");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.stack : "Unknown error";
    logger.error("Failed to bootstrap application", errorMessage);
    process.exit(1);
  }
}

bootstrap().catch((error: unknown) => {
  console.error("Failed to start application:", error);
  process.exit(1);
});
