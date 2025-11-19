import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue, Job } from "bullmq";

export interface QueueMetrics {
  name: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  rates: {
    completionRate: number;
    failureRate: number;
    avgProcessingTime: number;
  };
  performance: {
    totalProcessed: number;
    totalFailed: number;
    oldestJob: {
      id?: string;
      timestamp?: string;
    };
  };
}

export interface DashboardStats {
  queues: QueueMetrics[];
  summary: {
    totalJobs: number;
    totalActive: number;
    totalFailed: number;
    totalCompleted: number;
    overallHealthScore: number;
  };
  redis: {
    connected: boolean;
    memoryUsage?: string;
  };
  timestamp: string;
}

@Injectable()
export class QueueMonitoringService {
  private readonly logger = new Logger(QueueMonitoringService.name);

  constructor(
    @InjectQueue("email") private readonly emailQueue: Queue,
    @InjectQueue("workflow") private readonly workflowQueue: Queue,
  ) {}

  async getComprehensiveMetrics(): Promise<DashboardStats> {
    this.logger.debug("Fetching comprehensive queue metrics");

    const emailMetrics = await this.getQueueMetrics(this.emailQueue, "email");
    const workflowMetrics = await this.getQueueMetrics(
      this.workflowQueue,
      "workflow",
    );

    const allMetrics = [emailMetrics, workflowMetrics];

    const totalJobs = allMetrics.reduce(
      (sum, q) =>
        sum +
        q.counts.waiting +
        q.counts.active +
        q.counts.completed +
        q.counts.failed,
      0,
    );
    const totalActive = allMetrics.reduce((sum, q) => sum + q.counts.active, 0);
    const totalFailed = allMetrics.reduce((sum, q) => sum + q.counts.failed, 0);
    const totalCompleted = allMetrics.reduce(
      (sum, q) => sum + q.counts.completed,
      0,
    );

    const overallHealthScore = this.calculateHealthScore(
      totalCompleted,
      totalFailed,
    );

    return {
      queues: allMetrics,
      summary: {
        totalJobs,
        totalActive,
        totalFailed,
        totalCompleted,
        overallHealthScore,
      },
      redis: {
        connected: true,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async getQueueMetrics(
    queue: Queue,
    name: string,
  ): Promise<QueueMetrics> {
    const counts = await queue.getJobCounts();
    const isPaused = await queue.isPaused();

    const completedJobs = await queue.getCompleted(0, 100);
    const failedJobs = await queue.getFailed(0, 100);
    const waitingJobs = await queue.getWaiting(0, 1);

    const avgProcessingTime =
      await this.calculateAvgProcessingTime(completedJobs);

    const totalProcessed = completedJobs.length;
    const totalFailed = failedJobs.length;

    const oldestWaitingJob = waitingJobs[0];
    const oldestJobInfo = oldestWaitingJob
      ? {
          id: oldestWaitingJob.id,
          timestamp: new Date(oldestWaitingJob.timestamp || 0).toISOString(),
        }
      : {};

    const completionRate =
      totalProcessed + totalFailed > 0
        ? (totalProcessed / (totalProcessed + totalFailed)) * 100
        : 0;

    const failureRate =
      totalProcessed + totalFailed > 0
        ? (totalFailed / (totalProcessed + totalFailed)) * 100
        : 0;

    return {
      name,
      counts: {
        waiting: counts.waiting,
        active: counts.active,
        completed: counts.completed,
        failed: counts.failed,
        delayed: counts.delayed,
        paused: isPaused ? 1 : 0,
      },
      rates: {
        completionRate: Math.round(completionRate * 100) / 100,
        failureRate: Math.round(failureRate * 100) / 100,
        avgProcessingTime: Math.round(avgProcessingTime),
      },
      performance: {
        totalProcessed,
        totalFailed,
        oldestJob: oldestJobInfo,
      },
    };
  }

  private calculateAvgProcessingTime(jobs: Job[]): number {
    if (jobs.length === 0) return 0;

    const processingTimes = jobs
      .map((job) => {
        const startTime = job.processedOn || 0;
        const endTime = job.finishedOn || 0;
        return endTime - startTime;
      })
      .filter((time) => time > 0);

    if (processingTimes.length === 0) return 0;

    const sum = processingTimes.reduce((a, b) => a + b, 0);
    return sum / processingTimes.length;
  }

  private calculateHealthScore(completed: number, failed: number): number {
    const total = completed + failed;
    if (total === 0) return 100;

    const failureRate = (failed / total) * 100;

    if (failureRate === 0) return 100;
    if (failureRate <= 5) return 90;
    if (failureRate <= 10) return 75;
    if (failureRate <= 20) return 50;
    return 25;
  }

  async getQueueDetails(queueName: "email" | "workflow") {
    const queue = queueName === "email" ? this.emailQueue : this.workflowQueue;

    const counts = await queue.getJobCounts();
    const waiting = await queue.getWaiting(0, 20);
    const active = await queue.getActive(0, 20);
    const completed = await queue.getCompleted(0, 20);
    const failed = await queue.getFailed(0, 20);
    const delayed = await queue.getDelayed(0, 20);

    return {
      name: queueName,
      counts,
      jobs: {
        waiting: this.formatJobs(waiting),
        active: this.formatJobs(active),
        completed: this.formatJobs(completed),
        failed: this.formatJobs(failed),
        delayed: this.formatJobs(delayed),
      },
      timestamp: new Date().toISOString(),
    };
  }

  private formatJobs(jobs: Job[]) {
    return jobs.map((job) => {
      const progressValue = typeof job.progress === "number" ? job.progress : 0;
      return {
        id: job.id,
        name: job.name,
        data: job.data,
        progress: progressValue,
        attempts: job.attemptsMade,
        maxAttempts: job.opts?.attempts || 0,
        status: this.getJobStatus(job),
        createdAt: new Date(job.timestamp).toISOString(),
        processedAt: job.processedOn
          ? new Date(job.processedOn).toISOString()
          : null,
        finishedAt: job.finishedOn
          ? new Date(job.finishedOn).toISOString()
          : null,
        failedReason: job.failedReason || null,
        stackTrace: job.stacktrace?.[0] || null,
      };
    });
  }

  private getJobStatus(job: Job): string {
    if (job.finishedOn) {
      return job.failedReason ? "failed" : "completed";
    }
    if (job.processedOn) {
      return "active";
    }
    if (job.delay && job.delay > 0) {
      return "delayed";
    }
    return "waiting";
  }

  async getPeerMetrics() {
    const emailMetrics = await this.getQueueMetrics(this.emailQueue, "email");
    const workflowMetrics = await this.getQueueMetrics(
      this.workflowQueue,
      "workflow",
    );

    return {
      email: {
        ...emailMetrics,
        healthStatus: this.getHealthStatus(emailMetrics.rates.failureRate),
      },
      workflow: {
        ...workflowMetrics,
        healthStatus: this.getHealthStatus(workflowMetrics.rates.failureRate),
      },
    };
  }

  private getHealthStatus(failureRate: number): string {
    if (failureRate === 0) return "excellent";
    if (failureRate <= 5) return "good";
    if (failureRate <= 10) return "fair";
    if (failureRate <= 20) return "poor";
    return "critical";
  }
}
