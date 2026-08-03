/**
 * M1 definition of done: a simulated payment travelling the whole rail —
 * initiation → provider callback → ledger entry → outbound webhook delivery,
 * including a forced-retry path.
 *
 * Runs against the real database and the real MTN adapter. Only the network
 * is faked, so signature verification, reference parsing, status mapping and
 * every constraint in the schema are genuinely exercised. No live money.
 */
import { createHmac, randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MtnMomoAdapter, type HttpRequest, type HttpResponse, type HttpTransport } from "@soma/adapters";
import { createPrismaClient } from "@soma/db";
import { PaymentsService } from "./payments.service.js";
import { WebhookDeliveryService } from "./webhook-delivery.service.js";
import { verifySignature } from "./webhook-signer.js";

const hasDb = !!process.env.DATABASE_URL;
const d = describe.skipIf(!hasDb);

const CALLBACK_SECRET = "sandbox-mtn-callback-secret";
const ENDPOINT_SECRET = "whsec_school_endpoint_secret";

// A fresh tenant per run. The ledger is append-only, so its rows outlive any
// cleanup — isolating by school is what keeps counts meaningful across runs.
const SCHOOL_ID = randomUUID();
const STUDENT_ID = randomUUID();
const ENDPOINT_ID = randomUUID();
const OTHER_SCHOOL_ID = randomUUID();
const PAYMENT_CODE = "1009876543";
const AMOUNT = 45_000_000n; // UGX 450,000 in cents

class ScriptedTransport implements HttpTransport {
  readonly sent: HttpRequest[] = [];
  private responses: HttpResponse[] = [];

  queue(...responses: HttpResponse[]): void {
    this.responses.push(...responses);
  }
  reset(): void {
    this.sent.length = 0;
    this.responses = [];
  }
  async send(request: HttpRequest): Promise<HttpResponse> {
    this.sent.push(request);
    const next = this.responses.shift();
    if (!next) throw new Error("connection refused");
    return next;
  }
}

const prisma = hasDb ? createPrismaClient() : null!;
const railTransport = new ScriptedTransport();
const webhookTransport = new ScriptedTransport();

const adapter = new MtnMomoAdapter(
  {
    mode: "partner",
    baseUrl: "https://sandbox.example/mtn",
    subscriptionKey: "sub",
    apiUser: "user",
    apiKey: "key",
    callbackSecret: CALLBACK_SECRET,
    targetEnvironment: "sandbox",
  },
  railTransport,
);

const payments = new PaymentsService(prisma, new Map([["mtn_momo", adapter]]));
const deliveries = new WebhookDeliveryService(prisma, webhookTransport);

/** Signs a provider callback the way MTN would. */
function providerCallback(somaRef: string, status: string): { body: string; signature: string } {
  const body = JSON.stringify({ externalId: somaRef, status });
  return {
    body,
    signature: createHmac("sha256", CALLBACK_SECRET).update(body).digest("hex"),
  };
}

async function cleanPaymentData(): Promise<void> {
  await prisma.webhookDelivery.deleteMany({ where: { schoolId: SCHOOL_ID } });
  await prisma.inboundCallback.deleteMany({});
  await prisma.payment.deleteMany({ where: { schoolId: SCHOOL_ID } });
  await prisma.paymentIntent.deleteMany({ where: { schoolId: SCHOOL_ID } });
}

/** Ledger entries cannot be deleted, so count them per payment reference. */
function ledgerEntriesFor(somaRef: string): Promise<number> {
  return prisma.ledgerEntry.count({
    where: { schoolId: SCHOOL_ID, refs: { path: ["somaRef"], equals: somaRef } },
  });
}

beforeAll(async () => {
  if (!hasDb) return;
  await prisma.school.upsert({
    where: { id: SCHOOL_ID },
    update: {},
    create: {
      id: SCHOOL_ID,
      name: "Lifecycle Test School",
      country: "UG",
      currency: "UGX",
      timezone: "Africa/Kampala",
    },
  });
  await prisma.student.upsert({
    where: { id: STUDENT_ID },
    update: { externalRef: PAYMENT_CODE, status: "ENROLLED" },
    create: {
      id: STUDENT_ID,
      schoolId: SCHOOL_ID,
      externalRef: PAYMENT_CODE,
      firstName: "Amina",
      lastName: "Nakato",
      className: "P5",
    },
  });
  await prisma.webhookEndpoint.upsert({
    where: { id: ENDPOINT_ID },
    update: { secret: ENDPOINT_SECRET, enabled: true },
    create: {
      id: ENDPOINT_ID,
      schoolId: SCHOOL_ID,
      url: "https://school.example/soma-events",
      secret: ENDPOINT_SECRET,
    },
  });
  await cleanPaymentData();
});

beforeEach(() => {
  railTransport.reset();
  webhookTransport.reset();
});

afterAll(async () => {
  if (!hasDb) return;
  await cleanPaymentData();
  await prisma.webhookEndpoint.deleteMany({ where: { schoolId: SCHOOL_ID } });
  await prisma.student.deleteMany({ where: { schoolId: SCHOOL_ID } });
  await prisma.$disconnect();
});

d("step 1 — payment code lookup", () => {
  it("returns a token and NOTHING about the student", async () => {
    const result = await payments.lookup(SCHOOL_ID, PAYMENT_CODE);

    expect(result.valid).toBe(true);
    expect(result.intentToken).toBeTruthy();

    // The incumbent leaked full student records from exactly this call.
    // Assert on the serialized response so a future field cannot slip through.
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("Amina");
    expect(serialized).not.toContain("Nakato");
    expect(serialized).not.toContain("P5");
    expect(serialized).not.toContain("Lifecycle Test School");
    expect(Object.keys(result).sort()).toEqual(["expiresInSeconds", "intentToken", "valid"]);
  });

  it("reports an unknown code as invalid without a token", async () => {
    const result = await payments.lookup(SCHOOL_ID, "0000000000");
    expect(result).toEqual({ valid: false });
  });

  it("will not find a student belonging to another school", async () => {
    const result = await payments.lookup(OTHER_SCHOOL_ID, PAYMENT_CODE);
    expect(result.valid).toBe(false);
  });

  it("stores the token hashed, never in plaintext", async () => {
    const { intentToken } = await payments.lookup(SCHOOL_ID, PAYMENT_CODE);
    const stored = await prisma.paymentIntent.findFirst({
      where: { schoolId: SCHOOL_ID },
      orderBy: { createdAt: "desc" },
    });
    expect(stored!.tokenHash).not.toBe(intentToken);
    expect(stored!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

d("step 2 — confirmation triggers the debit prompt", () => {
  it("creates a pending payment and asks the rail for a prompt", async () => {
    const { intentToken } = await payments.lookup(SCHOOL_ID, PAYMENT_CODE);
    railTransport.queue({ status: 202, body: "" });

    const result = await payments.confirm(intentToken!, AMOUNT, "+256700123456", "MTN_MOMO");

    expect(result.status).toBe("pending");
    expect(result.somaReference).toMatch(/^SOMA/);

    const payment = await prisma.payment.findUnique({ where: { somaRef: result.somaReference } });
    expect(payment).toMatchObject({
      schoolId: SCHOOL_ID,
      studentId: STUDENT_ID,
      status: "PENDING",
      amountMinor: AMOUNT,
      currency: "UGX",
    });
    // Nothing is owed to the ledger until the money actually arrives.
    expect(await ledgerEntriesFor(result.somaReference)).toBe(0);
  });

  it("refuses to reuse an intent, so a replayed confirm cannot double-charge", async () => {
    const { intentToken } = await payments.lookup(SCHOOL_ID, PAYMENT_CODE);
    railTransport.queue({ status: 202, body: "" });
    await payments.confirm(intentToken!, AMOUNT, "+256700123456", "MTN_MOMO");

    railTransport.queue({ status: 202, body: "" });
    await expect(
      payments.confirm(intentToken!, AMOUNT, "+256700123456", "MTN_MOMO"),
    ).rejects.toThrow(/no longer valid/);
  });

  it("marks the payment failed when the rail declines", async () => {
    const { intentToken } = await payments.lookup(SCHOOL_ID, PAYMENT_CODE);
    railTransport.queue({ status: 400, body: '{"message":"declined"}' });

    await expect(
      payments.confirm(intentToken!, AMOUNT, "+256700123456", "MTN_MOMO"),
    ).rejects.toThrow(/declined this payment/);

    const failed = await prisma.payment.findFirst({
      where: { schoolId: SCHOOL_ID, status: "FAILED" },
      orderBy: { createdAt: "desc" },
    });
    expect(failed).not.toBeNull();
  });
});

d("full lifecycle — initiation to ledger entry to delivered webhook", () => {
  it("carries a payment all the way through, then survives a failed delivery", async () => {
    await cleanPaymentData();

    // ── initiation ────────────────────────────────────────────────────────
    const { intentToken } = await payments.lookup(SCHOOL_ID, PAYMENT_CODE);
    railTransport.queue({ status: 202, body: "" });
    const { somaReference } = await payments.confirm(
      intentToken!,
      AMOUNT,
      "+256700123456",
      "MTN_MOMO",
    );

    // ── provider callback ─────────────────────────────────────────────────
    const callback = providerCallback(somaReference, "SUCCESSFUL");
    expect(adapter.verifyInboundSignature(callback.body, callback.signature)).toBe(true);
    expect(await payments.handleCallback("mtn_momo", callback.body)).toEqual({ processed: true });

    const paid = await prisma.payment.findUniqueOrThrow({ where: { somaRef: somaReference } });
    expect(paid.status).toBe("SUCCEEDED");
    expect(paid.paidAt).not.toBeNull();
    expect(paid.receiptNo).toMatch(/^RCPT-/);

    // ── ledger entry ──────────────────────────────────────────────────────
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        schoolId: SCHOOL_ID,
        type: "PAYMENT_RECEIVED",
        refs: { path: ["somaRef"], equals: somaReference },
      },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.amountMinor).toBe(AMOUNT);
    expect(entries[0]!.currency).toBe("UGX");
    expect(entries[0]!.refs).toMatchObject({ somaRef: somaReference, provider: "mtn_momo" });

    // ── outbound delivery queued in the same transaction ──────────────────
    const queued = await prisma.webhookDelivery.findMany({ where: { schoolId: SCHOOL_ID } });
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ eventType: "payment.succeeded", status: "PENDING", attempts: 0 });

    // ── forced retry: the receiver is down, then recovers ─────────────────
    webhookTransport.queue({ status: 500, body: "receiver on fire" });
    const firstAttempt = await deliveries.drain();

    expect(firstAttempt).toHaveLength(1);
    expect(firstAttempt[0]).toMatchObject({ delivered: false, attempts: 1, dead: false });

    const afterFailure = await prisma.webhookDelivery.findUniqueOrThrow({
      where: { id: queued[0]!.id },
    });
    expect(afterFailure.status).toBe("PENDING");
    expect(afterFailure.lastError).toBe("HTTP 500");
    expect(afterFailure.nextAttemptAt).not.toBeNull();

    // Backoff is real: the row is not due yet, so a drain now picks nothing up.
    expect(await deliveries.drain()).toHaveLength(0);

    // Make it due, then let the receiver answer.
    await prisma.webhookDelivery.update({
      where: { id: queued[0]!.id },
      data: { nextAttemptAt: new Date(Date.now() - 1000) },
    });
    webhookTransport.queue({ status: 200, body: "ok" });
    const secondAttempt = await deliveries.drain();

    expect(secondAttempt[0]).toMatchObject({ delivered: true, attempts: 2 });
    const delivered = await prisma.webhookDelivery.findUniqueOrThrow({
      where: { id: queued[0]!.id },
    });
    expect(delivered.status).toBe("DELIVERED");
    expect(delivered.deliveredAt).not.toBeNull();

    // ── what the receiver actually got ────────────────────────────────────
    const [firstSend, secondSend] = webhookTransport.sent;
    const body = secondSend!.body!;
    expect(
      verifySignature(body, secondSend!.headers["Soma-Signature"]!, ENDPOINT_SECRET),
    ).toBe(true);
    // The idempotency key is stable across retries, so a receiver that
    // processed the failed-but-delivered first attempt can discard the second.
    expect(secondSend!.headers["Soma-Idempotency-Key"]).toBe(
      firstSend!.headers["Soma-Idempotency-Key"],
    );
    expect(secondSend!.headers["Soma-Delivery-Attempt"]).toBe("2");
    expect(JSON.parse(body)).toMatchObject({
      type: "payment.succeeded",
      data: { somaReference, amountMinor: AMOUNT.toString(), currency: "UGX" },
    });
  });

  it("ignores a replayed provider callback instead of double-crediting", async () => {
    await cleanPaymentData();
    const { intentToken } = await payments.lookup(SCHOOL_ID, PAYMENT_CODE);
    railTransport.queue({ status: 202, body: "" });
    const { somaReference } = await payments.confirm(
      intentToken!,
      AMOUNT,
      "+256700123456",
      "MTN_MOMO",
    );

    const callback = providerCallback(somaReference, "SUCCESSFUL");
    await payments.handleCallback("mtn_momo", callback.body);
    // The rail retries the same event three more times.
    await payments.handleCallback("mtn_momo", callback.body);
    await payments.handleCallback("mtn_momo", callback.body);
    await payments.handleCallback("mtn_momo", callback.body);

    expect(await ledgerEntriesFor(somaReference)).toBe(1);
    expect(await prisma.webhookDelivery.count({ where: { schoolId: SCHOOL_ID } })).toBe(1);
    expect(await prisma.inboundCallback.count({ where: { somaRef: somaReference } })).toBe(1);
  });

  it("records a callback for an unknown reference without applying it", async () => {
    await cleanPaymentData();
    const callback = providerCallback("SOMAUNKNOWNREF0", "SUCCESSFUL");
    expect(await payments.handleCallback("mtn_momo", callback.body)).toEqual({ processed: false });
    expect(await ledgerEntriesFor("SOMAUNKNOWNREF0")).toBe(0);
    // Still captured, so an operator can investigate the orphan.
    expect(await prisma.inboundCallback.count({ where: { somaRef: "SOMAUNKNOWNREF0" } })).toBe(1);
  });

  it("writes no ledger entry when the rail reports failure", async () => {
    await cleanPaymentData();
    const { intentToken } = await payments.lookup(SCHOOL_ID, PAYMENT_CODE);
    railTransport.queue({ status: 202, body: "" });
    const { somaReference } = await payments.confirm(
      intentToken!,
      AMOUNT,
      "+256700123456",
      "MTN_MOMO",
    );

    await payments.handleCallback("mtn_momo", providerCallback(somaReference, "FAILED").body);

    const payment = await prisma.payment.findUniqueOrThrow({ where: { somaRef: somaReference } });
    expect(payment.status).toBe("FAILED");
    expect(payment.paidAt).toBeNull();
    expect(await ledgerEntriesFor(somaReference)).toBe(0);
    expect(await prisma.webhookDelivery.count({ where: { schoolId: SCHOOL_ID } })).toBe(0);
  });

  it("gives up after the attempt budget and marks the delivery dead", async () => {
    await cleanPaymentData();
    const { intentToken } = await payments.lookup(SCHOOL_ID, PAYMENT_CODE);
    railTransport.queue({ status: 202, body: "" });
    const { somaReference } = await payments.confirm(
      intentToken!,
      AMOUNT,
      "+256700123456",
      "MTN_MOMO",
    );
    await payments.handleCallback("mtn_momo", providerCallback(somaReference, "SUCCESSFUL").body);

    const delivery = await prisma.webhookDelivery.findFirstOrThrow({
      where: { schoolId: SCHOOL_ID },
    });
    for (let i = 0; i < 8; i++) {
      webhookTransport.queue({ status: 503, body: "still down" });
      await deliveries.attempt(delivery.id);
    }

    const dead = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
    expect(dead.status).toBe("DEAD");
    expect(dead.attempts).toBe(8);
    expect(dead.nextAttemptAt).toBeNull();

    // A dead delivery is recoverable by hand — the replay endpoint's job.
    await deliveries.replay(delivery.id, SCHOOL_ID);
    const revived = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
    expect(revived).toMatchObject({ status: "PENDING", attempts: 0, lastError: null });
  });

  it("scopes replay to the caller's own school", async () => {
    const delivery = await prisma.webhookDelivery.findFirstOrThrow({
      where: { schoolId: SCHOOL_ID },
    });
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: { status: "DEAD", attempts: 8 },
    });

    await deliveries.replay(delivery.id, OTHER_SCHOOL_ID);

    const untouched = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
    expect(untouched.status).toBe("DEAD");
  });
});

d("reconciliation fallback — the callback that never came", () => {
  it("polls the rail and produces the same records as a callback would", async () => {
    await cleanPaymentData();
    const { intentToken } = await payments.lookup(SCHOOL_ID, PAYMENT_CODE);
    railTransport.queue({ status: 202, body: "" });
    const { somaReference } = await payments.confirm(
      intentToken!,
      AMOUNT,
      "+256700123456",
      "MTN_MOMO",
    );

    // No callback arrives. The bursar asks Soma to check with MTN directly.
    railTransport.queue({ status: 200, body: '{"status":"SUCCESSFUL"}' });
    const status = await payments.refreshStatus(SCHOOL_ID, somaReference);

    expect(status).toBe("SUCCEEDED");
    expect(await ledgerEntriesFor(somaReference)).toBe(1);
    expect(await prisma.webhookDelivery.count({ where: { schoolId: SCHOOL_ID } })).toBe(1);
  });

  it("refuses to reconcile another school's payment", async () => {
    await expect(
      payments.refreshStatus(OTHER_SCHOOL_ID, "SOMAWHATEVER1"),
    ).rejects.toThrow(/not found/i);
  });
});
