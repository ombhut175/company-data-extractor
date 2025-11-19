import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";

export interface WorkflowJobData {
  workflowId: string;
  userId: string;
  payload: Record<string, unknown>;
  step?: number;
}

@Processor("workflow", { concurrency: 2 })
export class WorkflowProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowProcessor.name);

  async process(job: Job<WorkflowJobData>): Promise<Record<string, unknown>> {
    this.logger.log(
      `Processing workflow job ${job.id} - Workflow: ${job.data.workflowId}, User: ${job.data.userId}`,
    );

    try {
      const result = await this.executeWorkflow(job.data);
      this.logger.log(`Workflow job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      this.logger.error(
        `Workflow job ${job.id} failed: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<WorkflowJobData>, result: Record<string, unknown>) {
    this.logger.debug(`Workflow job ${job.id} completed with result:`, result);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<WorkflowJobData> | undefined, err: Error) {
    if (job) {
      this.logger.error(
        `Workflow job ${job.id} failed after ${job.attemptsMade} attempts: ${err.message}`,
      );
    }
  }

  @OnWorkerEvent("stalled")
  onStalled(jobId: string) {
    this.logger.warn(`Workflow job ${jobId} stalled`);
  }

  private async executeWorkflow(
    data: WorkflowJobData,
  ): Promise<Record<string, unknown>> {
    await new Promise((resolve) => {
      setTimeout(() => {
        this.logger.debug(`Executed workflow step ${data.step || 1}`);
        resolve(undefined);
      }, 500);
    });

    return {
      workflowId: data.workflowId,
      userId: data.userId,
      executedAt: new Date().toISOString(),
      status: "completed",
    };
  }
}
