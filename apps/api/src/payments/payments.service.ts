import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Logger } from "@nestjs/common";
import type { PaymentProviderAdapter } from "@soma/adapters";
import { DomainError, Money, SomaReference, type Currency } from "@soma/core";
import type { SomaPrismaClient } from "@soma/db";

export class PaymentNotFoundError extends DomainError {
  readonly code = "PAYMENT_NOT_FOUND";
  constructor() {
    super("Payment not found");
  }
}

export class IntentInvalidError extends DomainError {
  readonly code = "INTENT_INVALID";
  constructor() {
    // Deliberately vague: expired, already used, and never existed are
    // indistinguishable to an unauthenticated caller.
    super("This payment session is no longer valid. Start again.");
  }
}

export class InitiationRejectedError extends DomainError {
  readonly code = "INITIATION_REJECTED";
  constructor() {
    super("The mobile money provider declined this payment. Try again.");
  }
}

const INTENT_TTL_MS = 10 * 60 * 1000;

export interface LookupResult {
  valid: boolean;
  intentToken?: string;
  expiresInSeconds?: number;
}

export interface ConfirmResult {
  somaReference: string;
  status: "pending" | "rejected";
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * The payments context (CLAUDE.md §2.1) — the only place money moves.
 * Kept free of cross-context table access so it can be audited on its own.
 */
export class PaymentsService {
  private readonly logger = new Logger("payments");

  constructor(
    private readonly prisma: SomaPrismaClient,
    private readonly adapters: Map<string, PaymentProviderAdapter>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Step 1 of the payer flow: validate a school payment code.
   *
   * Returns validity and an opaque token — never the student's name, school,
   * or balance (CLAUDE.md §8.1). The token is stored hashed, so a database
   * read cannot reconstruct a live payment session.
   */
  async lookup(schoolId: string, paymentCode: string): Promise<LookupResult> {
    const student = await this.prisma.student.findFirst({
      where: { schoolId, externalRef: paymentCode, status: "ENROLLED" },
      select: { id: true },
    });
    if (!student) return { valid: false };

    const token = randomBytes(32).toString("base64url");
    await this.prisma.paymentIntent.create({
      data: {
        tokenHash: hashToken(token),
        schoolId,
        studentId: student.id,
        expiresAt: new Date(this.now().getTime() + INTENT_TTL_MS),
      },
    });

    return { valid: true, intentToken: token, expiresInSeconds: INTENT_TTL_MS / 1000 };
  }

  /**
   * Step 2: consume the intent and ask the rail for a debit prompt.
   * The intent is single-use, so a replayed confirm cannot double-charge.
   */
  async confirm(
    intentToken: string,
    amountMinor: bigint,
    payerPhone: string,
    channel: "MTN_MOMO" | "AIRTEL_MONEY",
  ): Promise<ConfirmResult> {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { tokenHash: hashToken(intentToken) },
    });
    if (!intent || intent.usedAt || intent.expiresAt < this.now()) {
      throw new IntentInvalidError();
    }

    // Claim the intent before touching a rail: if two confirms race, exactly
    // one updates a row and the loser is rejected.
    const claimed = await this.prisma.paymentIntent.updateMany({
      where: { id: intent.id, usedAt: null },
      data: { usedAt: this.now() },
    });
    if (claimed.count === 0) throw new IntentInvalidError();

    const school = await this.prisma.school.findUniqueOrThrow({
      where: { id: intent.schoolId },
      select: { currency: true },
    });
    const reference = SomaReference.generate();
    const amount = Money.of(amountMinor, school.currency as Currency);

    const payment = await this.prisma.payment.create({
      data: {
        schoolId: intent.schoolId,
        studentId: intent.studentId,
        amountMinor: amount.minorUnits,
        currency: amount.currency,
        channel,
        somaRef: reference.value,
        payerPhone,
        status: "PENDING",
      },
    });

    const adapter = this.adapterFor(channel);
    const result = await adapter.initiatePayment({
      somaReference: reference.value,
      amount,
      payerPhone,
      narration: `School fees ${reference.format()}`,
    });

    if (result.status === "rejected") {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
      throw new InitiationRejectedError();
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: result.providerRef ?? null },
    });

    return { somaReference: reference.value, status: "pending" };
  }

  /**
   * Handle a verified inbound callback.
   *
   * Everything that must agree — the dedupe record, the payment's new status,
   * the ledger entry, and the outbound notifications — commits in one
   * transaction. A duplicate callback trips the unique constraint on
   * (provider, eventId) and is a no-op.
   */
  async handleCallback(provider: string, rawPayload: string): Promise<{ processed: boolean }> {
    const adapter = this.adapters.get(provider);
    if (!adapter) return { processed: false };

    const event = adapter.parseWebhook(rawPayload);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.inboundCallback.create({
          data: {
            provider,
            eventId: event.eventId,
            somaRef: event.somaReference,
            payload: JSON.parse(rawPayload) as object,
          },
        });

        const payment = await tx.payment.findUnique({
          where: { somaRef: event.somaReference },
        });
        // An unknown reference is recorded above for investigation, not applied.
        if (!payment || payment.status !== "PENDING") return { processed: false };

        if (event.status === "pending" || event.status === "unknown") {
          return { processed: false };
        }

        const succeeded = event.status === "succeeded";
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: succeeded ? "SUCCEEDED" : "FAILED",
            paidAt: succeeded ? this.now() : null,
            receiptNo: succeeded ? `RCPT-${payment.somaRef.slice(4, 12)}` : null,
          },
        });

        if (!succeeded) return { processed: true };

        // Append-only: this row is the immutable financial fact.
        await tx.ledgerEntry.create({
          data: {
            schoolId: payment.schoolId,
            type: "PAYMENT_RECEIVED",
            amountMinor: payment.amountMinor,
            currency: payment.currency,
            refs: {
              paymentId: payment.id,
              somaRef: payment.somaRef,
              provider,
              ...(payment.studentId ? { studentId: payment.studentId } : {}),
            },
          },
        });

        await this.enqueueEvent(tx, payment.schoolId, "payment.succeeded", {
          somaReference: payment.somaRef,
          amountMinor: payment.amountMinor.toString(),
          currency: payment.currency,
          channel: payment.channel,
          studentId: payment.studentId,
          paidAt: this.now().toISOString(),
        });

        return { processed: true };
      });
    } catch (err) {
      // Unique violation on (provider, eventId): the callback was already applied.
      if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
        this.logger.log(JSON.stringify({ msg: "duplicate callback ignored", provider }));
        return { processed: false };
      }
      throw err;
    }
  }

  /** Poll the rail for a payment whose callback never arrived. */
  async refreshStatus(schoolId: string, somaRef: string): Promise<string> {
    const payment = await this.prisma.payment.findFirst({
      where: { schoolId, somaRef },
    });
    if (!payment) throw new PaymentNotFoundError();
    if (payment.status !== "PENDING" || !payment.providerRef) return payment.status;

    const adapter = this.adapterFor(payment.channel);
    const status = await adapter.checkStatus(payment.providerRef);
    if (status === "pending" || status === "unknown") return payment.status;

    // Reuse the callback path so a polled result and a pushed one produce
    // identical records — including the ledger entry and outbound event.
    await this.handleCallback(adapter.name, JSON.stringify(this.syntheticCallback(adapter, payment.somaRef, status)));
    const refreshed = await this.prisma.payment.findFirstOrThrow({ where: { somaRef } });
    return refreshed.status;
  }

  private syntheticCallback(
    adapter: PaymentProviderAdapter,
    somaRef: string,
    status: "succeeded" | "failed",
  ): Record<string, unknown> {
    if (adapter.name === "airtel_money") {
      return { transaction: { id: somaRef, status: status === "succeeded" ? "TS" : "TF" } };
    }
    return { externalId: somaRef, status: status === "succeeded" ? "SUCCESSFUL" : "FAILED" };
  }

  /** Write one outbox row per enabled endpoint, inside the caller's transaction. */
  private async enqueueEvent(
    tx: Parameters<Parameters<SomaPrismaClient["$transaction"]>[0]>[0],
    schoolId: string,
    eventType: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const endpoints = await tx.webhookEndpoint.findMany({
      where: { schoolId, enabled: true },
    });
    if (endpoints.length === 0) return;

    await tx.webhookDelivery.createMany({
      data: endpoints.map((endpoint) => ({
        endpointId: endpoint.id,
        schoolId,
        eventType,
        payload: { id: randomUUID(), type: eventType, createdAt: this.now().toISOString(), data },
        idempotencyKey: randomUUID(),
      })),
    });
  }

  private adapterFor(channel: string): PaymentProviderAdapter {
    const key = channel.toLowerCase();
    const adapter = this.adapters.get(key);
    if (!adapter) throw new InitiationRejectedError();
    return adapter;
  }
}
