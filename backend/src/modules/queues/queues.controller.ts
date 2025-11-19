import {
  Controller,
  Post,
  Get,
  Body,
  Logger,
  HttpStatus,
  HttpCode,
  Param,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { successResponse } from "../../common/helpers/api-response.helper";
import { EmailQueueService } from "./services/email-queue.service";
import { WorkflowQueueService } from "./services/workflow-queue.service";
import { QueueMonitoringService } from "./services/queue-monitoring.service";
import { EmailJobData } from "./processors/email.processor";
import { WorkflowJobData } from "./processors/workflow.processor";

@ApiTags("queues")
@Controller("queues")
export class QueuesController {
  private readonly logger = new Logger(QueuesController.name);

  constructor(
    private readonly emailQueueService: EmailQueueService,
    private readonly workflowQueueService: WorkflowQueueService,
    private readonly monitoringService: QueueMonitoringService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get all queues status (root endpoint)" })
  @ApiResponse({
    status: 200,
    description: "All queues status retrieved successfully",
  })
  async getRootStatus() {
    this.logger.log("Root queues endpoint - redirecting to status");
    return this.getAllQueuesStatus();
  }

  @Post("email/send")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Send a single email job" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        to: { type: "string", example: "user@example.com" },
        subject: { type: "string", example: "Welcome" },
        body: { type: "string", example: "Welcome to VaultScout!" },
      },
      required: ["to", "subject", "body"],
    },
  })
  @ApiResponse({
    status: 202,
    description: "Email job queued successfully",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 202 },
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Email job queued successfully" },
        data: {
          type: "object",
          properties: {
            jobId: {
              type: "string",
              example: "1",
              description: "Unique job ID for tracking",
            },
            queue: { type: "string", example: "email" },
            status: { type: "string", example: "queued" },
            timestamp: { type: "string", example: "2025-11-14T16:45:00Z" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid email data",
  })
  @ApiResponse({
    status: 500,
    description: "Failed to queue email job",
  })
  async sendEmail(@Body() emailData: EmailJobData) {
    this.logger.log(`Queueing email job to ${emailData.to}`);

    try {
      const jobId = await this.emailQueueService.sendEmail(emailData);
      this.logger.log(`Email job ${jobId} queued successfully`);

      return successResponse(
        {
          jobId,
          queue: "email",
          status: "queued",
          timestamp: new Date().toISOString(),
        },
        "Email job queued successfully",
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to queue email job: ${errorMessage}`);
      throw error;
    }
  }

  @Post("email/send-bulk")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Send multiple email jobs in bulk" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        emails: {
          type: "array",
          items: {
            type: "object",
            properties: {
              to: { type: "string", example: "user@example.com" },
              subject: { type: "string", example: "Welcome" },
              body: { type: "string", example: "Welcome to VaultScout!" },
            },
            required: ["to", "subject", "body"],
          },
          example: [
            {
              to: "user1@example.com",
              subject: "Welcome",
              body: "Welcome to VaultScout!",
            },
            {
              to: "user2@example.com",
              subject: "Welcome",
              body: "Welcome to VaultScout!",
            },
          ],
        },
      },
      required: ["emails"],
    },
  })
  @ApiResponse({
    status: 202,
    description: "Bulk email jobs queued successfully",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 202 },
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Bulk email jobs queued successfully",
        },
        data: {
          type: "object",
          properties: {
            jobIds: {
              type: "array",
              items: { type: "string" },
              example: ["1", "2", "3"],
              description: "Array of queued job IDs",
            },
            count: { type: "number", example: 3 },
            queue: { type: "string", example: "email" },
            status: { type: "string", example: "queued" },
            timestamp: { type: "string", example: "2025-11-14T16:45:00Z" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid email data",
  })
  @ApiResponse({
    status: 500,
    description: "Failed to queue bulk email jobs",
  })
  async sendBulkEmails(@Body() { emails }: { emails: EmailJobData[] }) {
    this.logger.log(`Queueing ${emails.length} bulk email jobs`);

    try {
      const jobIds = await this.emailQueueService.sendBulkEmails(emails);
      this.logger.log(`${jobIds.length} email jobs queued successfully`);

      return successResponse(
        {
          jobIds,
          count: jobIds.length,
          queue: "email",
          status: "queued",
          timestamp: new Date().toISOString(),
        },
        "Bulk email jobs queued successfully",
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to queue bulk email jobs: ${errorMessage}`);
      throw error;
    }
  }

  @Post("workflow/execute")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Execute a workflow job" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        workflowId: { type: "string", example: "wf-123" },
        userId: { type: "string", example: "user-456" },
        payload: {
          type: "object",
          example: { action: "process_data", target: "vault" },
          description: "Custom workflow payload",
        },
        step: {
          type: "number",
          example: 1,
          description: "Optional workflow step",
        },
      },
      required: ["workflowId", "userId", "payload"],
    },
  })
  @ApiResponse({
    status: 202,
    description: "Workflow job queued successfully",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 202 },
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Workflow job queued successfully",
        },
        data: {
          type: "object",
          properties: {
            jobId: { type: "string", example: "1" },
            workflowId: { type: "string", example: "wf-123" },
            userId: { type: "string", example: "user-456" },
            queue: { type: "string", example: "workflow" },
            status: { type: "string", example: "queued" },
            timestamp: { type: "string", example: "2025-11-14T16:45:00Z" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Invalid workflow data",
  })
  @ApiResponse({
    status: 500,
    description: "Failed to queue workflow job",
  })
  async executeWorkflow(@Body() workflowData: WorkflowJobData) {
    this.logger.log(
      `Queueing workflow job ${workflowData.workflowId} for user ${workflowData.userId}`,
    );

    try {
      const jobId =
        await this.workflowQueueService.executeWorkflow(workflowData);
      this.logger.log(`Workflow job ${jobId} queued successfully`);

      return successResponse(
        {
          jobId,
          workflowId: workflowData.workflowId,
          userId: workflowData.userId,
          queue: "workflow",
          status: "queued",
          timestamp: new Date().toISOString(),
        },
        "Workflow job queued successfully",
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to queue workflow job: ${errorMessage}`);
      throw error;
    }
  }

  @Get("email/status")
  @ApiOperation({ summary: "Get email queue status" })
  @ApiResponse({
    status: 200,
    description: "Email queue status retrieved successfully",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 200 },
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Email queue status retrieved successfully",
        },
        data: {
          type: "object",
          properties: {
            queue: { type: "string", example: "email" },
            waiting: { type: "number", example: 5 },
            active: { type: "number", example: 2 },
            completed: { type: "number", example: 150 },
            failed: { type: "number", example: 3 },
            delayed: { type: "number", example: 0 },
            timestamp: { type: "string", example: "2025-11-14T16:45:00Z" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: "Failed to retrieve email queue status",
  })
  async getEmailQueueStatus() {
    this.logger.log("Retrieving email queue status");

    try {
      const status = await this.emailQueueService.getQueueStatus();
      this.logger.log("Email queue status retrieved successfully", {
        ...status,
      });

      return successResponse(
        {
          queue: "email",
          ...status,
          timestamp: new Date().toISOString(),
        },
        "Email queue status retrieved successfully",
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to retrieve email queue status: ${errorMessage}`,
      );
      throw error;
    }
  }

  @Get("workflow/status")
  @ApiOperation({ summary: "Get workflow queue status" })
  @ApiResponse({
    status: 200,
    description: "Workflow queue status retrieved successfully",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 200 },
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "Workflow queue status retrieved successfully",
        },
        data: {
          type: "object",
          properties: {
            queue: { type: "string", example: "workflow" },
            waiting: { type: "number", example: 2 },
            active: { type: "number", example: 1 },
            completed: { type: "number", example: 50 },
            failed: { type: "number", example: 1 },
            delayed: { type: "number", example: 0 },
            timestamp: { type: "string", example: "2025-11-14T16:45:00Z" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: "Failed to retrieve workflow queue status",
  })
  async getWorkflowQueueStatus() {
    this.logger.log("Retrieving workflow queue status");

    try {
      const status = await this.workflowQueueService.getQueueStatus();
      this.logger.log("Workflow queue status retrieved successfully", {
        ...status,
      });

      return successResponse(
        {
          queue: "workflow",
          ...status,
          timestamp: new Date().toISOString(),
        },
        "Workflow queue status retrieved successfully",
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to retrieve workflow queue status: ${errorMessage}`,
      );
      throw error;
    }
  }

  @Get("status")
  @ApiOperation({ summary: "Get all queues status summary" })
  @ApiResponse({
    status: 200,
    description: "All queues status retrieved successfully",
    schema: {
      type: "object",
      properties: {
        statusCode: { type: "number", example: 200 },
        success: { type: "boolean", example: true },
        message: {
          type: "string",
          example: "All queues status retrieved successfully",
        },
        data: {
          type: "object",
          properties: {
            email: {
              type: "object",
              properties: {
                waiting: { type: "number", example: 5 },
                active: { type: "number", example: 2 },
                completed: { type: "number", example: 150 },
                failed: { type: "number", example: 3 },
                delayed: { type: "number", example: 0 },
              },
            },
            workflow: {
              type: "object",
              properties: {
                waiting: { type: "number", example: 2 },
                active: { type: "number", example: 1 },
                completed: { type: "number", example: 50 },
                failed: { type: "number", example: 1 },
                delayed: { type: "number", example: 0 },
              },
            },
            summary: {
              type: "object",
              properties: {
                totalJobs: { type: "number", example: 212 },
                totalActive: { type: "number", example: 3 },
                totalFailed: { type: "number", example: 4 },
              },
            },
            timestamp: { type: "string", example: "2025-11-14T16:45:00Z" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: "Failed to retrieve queues status",
  })
  async getAllQueuesStatus() {
    this.logger.log("Retrieving all queues status");

    try {
      const emailStatus = await this.emailQueueService.getQueueStatus();
      const workflowStatus = await this.workflowQueueService.getQueueStatus();

      const totalActive = emailStatus.active + workflowStatus.active;
      const totalFailed = emailStatus.failed + workflowStatus.failed;
      const totalJobs =
        emailStatus.waiting +
        emailStatus.active +
        emailStatus.completed +
        emailStatus.failed +
        workflowStatus.waiting +
        workflowStatus.active +
        workflowStatus.completed +
        workflowStatus.failed;

      const allQueuesStatus = {
        email: emailStatus,
        workflow: workflowStatus,
        summary: {
          totalJobs,
          totalActive,
          totalFailed,
        },
        timestamp: new Date().toISOString(),
      };

      this.logger.log(
        "All queues status retrieved successfully",
        allQueuesStatus.summary,
      );

      return successResponse(
        allQueuesStatus,
        "All queues status retrieved successfully",
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to retrieve queues status: ${errorMessage}`);
      throw error;
    }
  }

  @Get("monitoring/dashboard")
  @ApiOperation({
    summary: "Get comprehensive monitoring dashboard with detailed metrics",
  })
  @ApiResponse({
    status: 200,
    description: "Dashboard metrics retrieved successfully",
  })
  async getMonitoringDashboard() {
    this.logger.log("Retrieving comprehensive monitoring dashboard");

    try {
      const metrics = await this.monitoringService.getComprehensiveMetrics();
      this.logger.log("Monitoring dashboard retrieved successfully");

      return successResponse(
        metrics,
        "Dashboard metrics retrieved successfully",
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to retrieve monitoring dashboard: ${errorMessage}`,
      );
      throw error;
    }
  }

  @Get("monitoring/details/:queueName")
  @ApiOperation({
    summary: "Get detailed queue information with job details",
  })
  @ApiResponse({
    status: 200,
    description: "Queue details retrieved successfully",
  })
  async getQueueDetails(
    @Param("queueName") queueName: "email" | "workflow" = "email",
  ) {
    this.logger.log(`Retrieving detailed information for queue: ${queueName}`);

    try {
      if (!["email", "workflow"].includes(queueName)) {
        throw new Error(
          `Invalid queue name: ${queueName}. Must be 'email' or 'workflow'`,
        );
      }

      const details = await this.monitoringService.getQueueDetails(queueName);
      this.logger.log(`Queue details retrieved successfully for: ${queueName}`);

      return successResponse(
        details,
        `Queue details retrieved successfully for ${queueName}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to retrieve queue details for ${queueName}: ${errorMessage}`,
      );
      throw error;
    }
  }

  @Get("monitoring/health")
  @ApiOperation({
    summary: "Get health status of all queues with detailed metrics",
  })
  @ApiResponse({
    status: 200,
    description: "Health metrics retrieved successfully",
  })
  async getHealthMetrics() {
    this.logger.log("Retrieving queue health metrics");

    try {
      const metrics = await this.monitoringService.getPeerMetrics();
      this.logger.log("Health metrics retrieved successfully");

      return successResponse(metrics, "Health metrics retrieved successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to retrieve health metrics: ${errorMessage}`);
      throw error;
    }
  }
}
