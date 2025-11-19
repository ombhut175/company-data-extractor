export { QueuesModule } from "./queues.module";
export { EmailQueueService } from "./services/email-queue.service";
export { WorkflowQueueService } from "./services/workflow-queue.service";
export { QueueMonitoringService } from "./services/queue-monitoring.service";
export { EmailProcessor } from "./processors/email.processor";
export { WorkflowProcessor } from "./processors/workflow.processor";
export type { EmailJobData } from "./processors/email.processor";
export type { WorkflowJobData } from "./processors/workflow.processor";
export type { QueueMetrics, DashboardStats } from "./services/queue-monitoring.service";
