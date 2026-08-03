import { QUEUES, defaultJobOptions } from "./queues.js";

/**
 * Outbox drain loop.
 *
 * Webhook rows are written in the same transaction as the payment they
 * describe, so this worker never decides *whether* an event exists — only
 * when to push it. That means a Redis outage delays delivery but cannot
 * lose an event, which is the property the queue alone could not give us.
 */
export interface Drainable {
  drain(limit?: number): Promise<unknown[]>;
}

export const WEBHOOK_DRAIN_QUEUE = QUEUES.webhookDelivery;
export const drainJobOptions = defaultJobOptions;

/** Interval between sweeps when nothing is due. */
export const IDLE_POLL_MS = 5_000;

/**
 * Run one sweep. Returns how many rows were attempted so a caller can poll
 * faster while a backlog is draining.
 */
export async function runDrainSweep(service: Drainable, batchSize = 50): Promise<number> {
  const outcomes = await service.drain(batchSize);
  return outcomes.length;
}
