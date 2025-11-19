import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { EmailJobData } from "../processors/email.processor";

@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue("email") private readonly emailQueue: Queue) {}

  async sendEmail(data: EmailJobData): Promise<string> {
    const job = await this.emailQueue.add("send-email", data, {
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
      throw new Error("Failed to create email job - job ID not assigned");
    }
    return job.id;
  }

  async sendBulkEmails(emails: EmailJobData[]): Promise<string[]> {
    const jobs = await this.emailQueue.addBulk(
      emails.map((email) => ({
        name: "send-email",
        data: email,
        opts: {
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
        },
      })),
    );

    return jobs.map((job) => {
      if (!job.id) {
        throw new Error(
          "Failed to create bulk email job - job ID not assigned",
        );
      }
      return job.id;
    });
  }

  async getQueueStatus() {
    const counts = await this.emailQueue.getJobCounts();
    return {
      waiting: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
    };
  }
}
