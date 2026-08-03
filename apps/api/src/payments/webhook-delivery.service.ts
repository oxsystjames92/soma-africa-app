import { Logger } from "@nestjs/common";
import type { SomaPrismaClient } from "@soma/db";
import type { HttpTransport } from "@soma/adapters";
import { isExhausted, nextAttemptDelayMs } from "./retry-policy.js";
import { signPayload } from "./webhook-signer.js";

export interface DeliveryOutcome {
  deliveryId: string;
  delivered: boolean;
  attempts: number;
  /** Set when the delivery has exhausted its attempts and will not be retried. */
  dead?: boolean;
}

/**
 * Drains the webhook outbox.
 *
 * Deliveries are rows written in the same transaction as the payment they
 * describe, so an event cannot be lost by a crash between committing money
 * and queueing its notification. This service only moves rows forward.
 */
export class WebhookDeliveryService {
  private readonly logger = new Logger("webhooks");

  constructor(
    private readonly prisma: SomaPrismaClient,
    private readonly transport: HttpTransport,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Deliver every row that is due. Returns one outcome per row attempted. */
  async drain(limit = 50): Promise<DeliveryOutcome[]> {
    const due = await this.prisma.webhookDelivery.findMany({
      where: {
        status: "PENDING",
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: this.now() } }],
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: { endpoint: true },
    });

    const outcomes: DeliveryOutcome[] = [];
    for (const delivery of due) {
      outcomes.push(await this.attempt(delivery.id));
    }
    return outcomes;
  }

  /** Attempt one delivery, recording the result and scheduling any retry. */
  async attempt(deliveryId: string): Promise<DeliveryOutcome> {
    const delivery = await this.prisma.webhookDelivery.findUniqueOrThrow({
      where: { id: deliveryId },
      include: { endpoint: true },
    });

    const attempts = delivery.attempts + 1;
    const body = JSON.stringify(delivery.payload);
    const timestamp = Math.floor(this.now().getTime() / 1000);

    let ok = false;
    let error: string | null = null;
    try {
      const res = await this.transport.send({
        method: "POST",
        url: delivery.endpoint.url,
        headers: {
          "Content-Type": "application/json",
          "Soma-Signature": signPayload(body, delivery.endpoint.secret, timestamp),
          // Stable across retries so receivers can dedupe (CLAUDE.md §8.4).
          "Soma-Idempotency-Key": delivery.idempotencyKey,
          "Soma-Event-Type": delivery.eventType,
          "Soma-Delivery-Attempt": String(attempts),
        },
        body,
      });
      ok = res.status >= 200 && res.status < 300;
      if (!ok) error = `HTTP ${res.status}`;
    } catch (err) {
      error = err instanceof Error ? err.message : "transport error";
    }

    if (ok) {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          attempts,
          status: "DELIVERED",
          deliveredAt: this.now(),
          nextAttemptAt: null,
          lastError: null,
        },
      });
      return { deliveryId, delivered: true, attempts };
    }

    const dead = isExhausted(attempts);
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        attempts,
        status: dead ? "DEAD" : "PENDING",
        lastError: error,
        nextAttemptAt: dead ? null : new Date(this.now().getTime() + nextAttemptDelayMs(attempts)),
      },
    });

    this.logger.warn(
      JSON.stringify({ deliveryId, attempts, dead, error, event: delivery.eventType }),
    );
    return { deliveryId, delivered: false, attempts, dead };
  }

  /**
   * Requeue a delivery for another run (CLAUDE.md §8.5 replay endpoint).
   * Attempts reset so a dead delivery gets a full fresh schedule.
   */
  async replay(deliveryId: string, schoolId: string): Promise<void> {
    await this.prisma.webhookDelivery.updateMany({
      where: { id: deliveryId, schoolId },
      data: { status: "PENDING", attempts: 0, nextAttemptAt: null, lastError: null },
    });
  }
}
