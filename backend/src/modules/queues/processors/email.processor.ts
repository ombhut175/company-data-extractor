import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  retries?: number;
}

@Processor("email", { concurrency: 5 })
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<EmailJobData>): Promise<void> {
    this.logger.log(`Processing email job ${job.id} to ${job.data.to}`);

    try {
      await this.sendEmail(job.data);
      this.logger.log(`Email sent successfully: ${job.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job<EmailJobData>) {
    this.logger.debug(`Email job ${job.id} completed`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<EmailJobData> | undefined, err: Error) {
    if (job) {
      this.logger.error(`Email job ${job.id} failed: ${err.message}`);
    }
  }

  @OnWorkerEvent("stalled")
  onStalled(jobId: string) {
    this.logger.warn(`Email job ${jobId} stalled`);
  }

  private async sendEmail(data: EmailJobData): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(() => {
        this.logger.debug(`Simulated email send to ${data.to}`);
        resolve(undefined);
      }, 100);
    });
  }
}
