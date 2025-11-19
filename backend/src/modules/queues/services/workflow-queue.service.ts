import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { WorkflowJobData } from "../processors/workflow.processor";

@Injectable()
export class WorkflowQueueService {
  constructor(@InjectQueue("workflow") private readonly workflowQueue: Queue) {}

  async executeWorkflow(data: WorkflowJobData): Promise<string> {
    const job = await this.workflowQueue.add("execute-workflow", data, {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600,
      },
      removeOnFail: {
        age: 86400,
      },
    });

    if (!job.id) {
      throw new Error("Failed to create workflow job - job ID not assigned");
    }
    return job.id;
  }

  async getQueueStatus() {
    const counts = await this.workflowQueue.getJobCounts();
    return {
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
    };
  }

  async pauseQueue(): Promise<void> {
    await this.workflowQueue.pause();
  }

  async resumeQueue(): Promise<void> {
    await this.workflowQueue.resume();
  }

  async getAllQueues() {
    return {
      workflow: await this.workflowQueue.getJobCounts(),
    };
  }
}
