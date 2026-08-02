/**
 * Queue names and shared BullMQ options.
 * Processors land with the milestones that need them: ingestion + webhook
 * delivery in M1, reconciliation in M2, notifications in M3.
 */
export const QUEUES = {
  ingestion: "soma.ingestion",
  reconciliation: "soma.reconciliation",
  notifications: "soma.notifications",
  webhookDelivery: "soma.webhook-delivery",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/** At-least-once delivery with exponential backoff (CLAUDE.md §8.5). */
export const defaultJobOptions = {
  attempts: 8,
  backoff: { type: "exponential" as const, delay: 5_000 },
  removeOnComplete: { age: 86_400 },
  removeOnFail: false,
} as const;
