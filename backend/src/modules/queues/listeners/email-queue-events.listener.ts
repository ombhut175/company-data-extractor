import {
  QueueEventsListener,
  QueueEventsHost,
  OnQueueEvent,
} from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";

@QueueEventsListener("email")
export class EmailQueueEventsListener extends QueueEventsHost {
  private readonly logger = new Logger(EmailQueueEventsListener.name);

  @OnQueueEvent("completed")
  onCompleted({ jobId }: { jobId: string }) {
    this.logger.log(`Email job ${jobId} completed`);
  }

  @OnQueueEvent("failed")
  onFailed({ jobId, failedReason }: { jobId: string; failedReason: string }) {
    this.logger.error(`Email job ${jobId} failed: ${failedReason}`);
  }

  @OnQueueEvent("delayed")
  onDelayed({ jobId }: { jobId: string }) {
    this.logger.warn(`Email job ${jobId} delayed`);
  }

  @OnQueueEvent("stalled")
  onStalled({ jobId }: { jobId: string }) {
    this.logger.warn(`Email job ${jobId} stalled`);
  }
}
