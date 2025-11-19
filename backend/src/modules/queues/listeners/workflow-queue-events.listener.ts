import {
  QueueEventsListener,
  QueueEventsHost,
  OnQueueEvent,
} from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";

@QueueEventsListener("workflow")
export class WorkflowQueueEventsListener extends QueueEventsHost {
  private readonly logger = new Logger(WorkflowQueueEventsListener.name);

  @OnQueueEvent("completed")
  onCompleted({ jobId, returnvalue }: { jobId: string; returnvalue: string }) {
    this.logger.log(
      `Workflow job ${jobId} completed with result: ${returnvalue}`,
    );
  }

  @OnQueueEvent("failed")
  onFailed({ jobId, failedReason }: { jobId: string; failedReason: string }) {
    this.logger.error(`Workflow job ${jobId} failed: ${failedReason}`);
  }

  @OnQueueEvent("delayed")
  onDelayed({ jobId }: { jobId: string }) {
    this.logger.warn(`Workflow job ${jobId} delayed`);
  }

  @OnQueueEvent("stalled")
  onStalled({ jobId }: { jobId: string }) {
    this.logger.warn(`Workflow job ${jobId} stalled`);
  }
}
