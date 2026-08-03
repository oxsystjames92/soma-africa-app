/**
 * Reconciliation against a real database.
 *
 * The pure matcher is tested adversarially in @soma/core. These tests cover
 * what only a database can prove: that decisions persist correctly, that money
 * lands on the right invoices, that re-running is safe, and that the audit
 * trail can answer "where did our money go?" weeks later.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPrismaClient } from "@soma/db";
import { InvoicingService } from "../schools/invoicing.service.js";
import { ReconciliationService } from "./reconciliation.service.js";

const hasDb = !!process.env.DATABASE_URL;
const d = describe.skipIf(!hasDb);

const prisma = hasDb ? createPrismaClient() : null!;
const reconciliation = new ReconciliationService(prisma);
const invoicing = new InvoicingService(prisma);

// A fresh tenant per run: the audit trail is append-only, so its rows outlive
// any cleanup.
const SCHOOL = randomUUID();
const OTHER_SCHOOL = randomUUID();
const TERM = randomUUID();
const CLASS = randomUUID();
const BURSAR = randomUUID();

const AMINA = randomUUID();
const JOSEPH = randomUUID();
/** Two children with the same name — the case that must never auto-confirm. */
const MUKASA_A = randomUUID();
const MUKASA_B = randomUUID();
/** Carries a 6-character code: strong enough to propose, too short to trust. */
const SARAH = randomUUID();

const FEES = 45_000_00n;

async function makeStudent(
  id: string,
  first: string,
  last: string,
  code: string | null,
  reg: string | null = null,
): Promise<void> {
  await prisma.student.upsert({
    where: { id },
    update: {},
    create: {
      id,
      schoolId: SCHOOL,
      firstName: first,
      lastName: last,
      externalRef: code,
      regNumber: reg,
      className: "P5",
    },
  });
}

async function makeInvoice(
  studentId: string,
  amountDue: bigint,
  dueDaysAgo: number,
  id = randomUUID(),
): Promise<string> {
  await prisma.invoice.create({
    data: {
      id,
      schoolId: SCHOOL,
      studentId,
      term: "2026-T1",
      termId: TERM,
      amountDueMinor: amountDue,
      currency: "UGX",
      dueDate: new Date(Date.now() - dueDaysAgo * 86_400_000),
      status: "ISSUED",
    },
  });
  return id;
}

/** A succeeded payment, optionally already linked to a student. */
async function makePayment(
  amount: bigint,
  studentId: string | null,
  somaRef = `SOMA${randomUUID().replace(/-/g, "").slice(0, 13).toUpperCase()}`,
): Promise<string> {
  const payment = await prisma.payment.create({
    data: {
      schoolId: SCHOOL,
      studentId,
      amountMinor: amount,
      currency: "UGX",
      channel: "MTN_MOMO",
      somaRef,
      payerPhone: "+256700123456",
      status: "SUCCEEDED",
      paidAt: new Date(),
    },
  });
  return payment.id;
}

async function resetTransactionalData(): Promise<void> {
  await prisma.reconciliationMatch.deleteMany({ where: { schoolId: SCHOOL } });
  await prisma.payment.deleteMany({ where: { schoolId: SCHOOL } });
  await prisma.invoice.deleteMany({ where: { schoolId: SCHOOL } });
}

beforeAll(async () => {
  if (!hasDb) return;
  for (const id of [SCHOOL, OTHER_SCHOOL]) {
    await prisma.school.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: `Recon Test ${id.slice(0, 8)}`,
        country: "UG",
        currency: "UGX",
        timezone: "Africa/Kampala",
      },
    });
  }
  await prisma.term.upsert({
    where: { id: TERM },
    update: {},
    create: {
      id: TERM,
      schoolId: SCHOOL,
      name: "2026-T1",
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-05-01"),
      status: "ACTIVE",
    },
  });
  await prisma.schoolClass.upsert({
    where: { id: CLASS },
    update: {},
    create: { id: CLASS, schoolId: SCHOOL, name: "P5", level: 5 },
  });

  await makeStudent(AMINA, "Amina", "Nakato", "1009876543", "STM/2024/0912");
  await makeStudent(JOSEPH, "Joseph", "Okello", "1004445555");
  await makeStudent(MUKASA_A, "John", "Mukasa", "1007770001");
  await makeStudent(MUKASA_B, "John", "Mukasa", "1007770002");
  await makeStudent(SARAH, "Sarah", "Namubiru", "AB1234");
});

beforeEach(async () => {
  if (!hasDb) return;
  await resetTransactionalData();
});

afterAll(async () => {
  if (!hasDb) return;
  await resetTransactionalData();
  await prisma.student.deleteMany({ where: { schoolId: SCHOOL } });
  await prisma.$disconnect();
});

d("auto-confirmation", () => {
  it("allocates a payment that already knows its student", async () => {
    const invoiceId = await makeInvoice(AMINA, FEES, 10);
    const paymentId = await makePayment(FEES, AMINA);

    const outcome = await reconciliation.reconcilePayment(SCHOOL, paymentId);
    expect(outcome).toMatchObject({ result: "auto_confirmed", studentId: AMINA, allocated: 1 });

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(invoice.amountPaidMinor).toBe(FEES);
    expect(invoice.status).toBe("PAID");

    const match = await prisma.reconciliationMatch.findFirstOrThrow({ where: { paymentId } });
    expect(match).toMatchObject({ status: "CONFIRMED", method: "AUTO", amountMinor: FEES });
  });

  it("writes an audit entry explaining the decision", async () => {
    await makeInvoice(AMINA, FEES, 10);
    const paymentId = await makePayment(FEES, AMINA);
    await reconciliation.reconcilePayment(SCHOOL, paymentId);

    const trail = await reconciliation.auditTrail(SCHOOL, paymentId);
    expect(trail).toHaveLength(1);
    expect(trail[0]).toMatchObject({ event: "MATCH_AUTO_CONFIRMED", studentId: AMINA });
    expect(trail[0]!.detail).toMatchObject({ confidence: 1 });
  });

  it("finds the student from a payment code in the reference", async () => {
    const invoiceId = await makeInvoice(AMINA, FEES, 10);
    // Payment arrived without a student link, but the reference carries the code.
    const paymentId = await makePayment(FEES, null, "SOMA1009876543X");

    const outcome = await reconciliation.reconcilePayment(SCHOOL, paymentId);
    expect(outcome).toMatchObject({ result: "auto_confirmed", studentId: AMINA });

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(invoice.status).toBe("PAID");
  });
});

d("partial and over payment", () => {
  it("applies a partial payment and leaves the invoice open", async () => {
    const invoiceId = await makeInvoice(AMINA, FEES, 10);
    const paymentId = await makePayment(20_000_00n, AMINA);

    await reconciliation.reconcilePayment(SCHOOL, paymentId);

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(invoice.amountPaidMinor).toBe(20_000_00n);
    expect(invoice.status).toBe("PARTIALLY_PAID");
  });

  it("clears the oldest invoice first and spills into the next", async () => {
    const oldest = await makeInvoice(AMINA, 30_000_00n, 200);
    const newer = await makeInvoice(AMINA, 30_000_00n, 10);
    const paymentId = await makePayment(50_000_00n, AMINA);

    const outcome = await reconciliation.reconcilePayment(SCHOOL, paymentId);
    expect(outcome).toMatchObject({ allocated: 2 });

    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: oldest } })).status).toBe("PAID");
    const second = await prisma.invoice.findUniqueOrThrow({ where: { id: newer } });
    expect(second.amountPaidMinor).toBe(20_000_00n);
    expect(second.status).toBe("PARTIALLY_PAID");
  });

  it("records an overpayment as credit without inventing an invoice", async () => {
    const invoiceId = await makeInvoice(AMINA, 30_000_00n, 10);
    const paymentId = await makePayment(50_000_00n, AMINA);

    await reconciliation.reconcilePayment(SCHOOL, paymentId);

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(invoice.amountPaidMinor).toBe(30_000_00n);
    expect(await prisma.reconciliationMatch.count({ where: { paymentId } })).toBe(1);

    const trail = await reconciliation.auditTrail(SCHOOL, paymentId);
    expect(trail[0]!.detail).toMatchObject({ creditMinor: "2000000" });
  });

  it("does not allocate a payment for a student with nothing owing", async () => {
    const paymentId = await makePayment(FEES, AMINA);
    const outcome = await reconciliation.reconcilePayment(SCHOOL, paymentId);

    expect(outcome).toMatchObject({ result: "auto_confirmed", allocated: 0 });
    const trail = await reconciliation.auditTrail(SCHOOL, paymentId);
    expect(trail[0]).toMatchObject({ event: "PAYMENT_UNMATCHED" });
    expect(trail[0]!.detail).toMatchObject({ reason: "Student matched but has no open invoice" });
  });
});

d("duplicate receipts — the same money must never land twice", () => {
  it("refuses to reconcile a payment that is already reconciled", async () => {
    const invoiceId = await makeInvoice(AMINA, FEES, 10);
    const paymentId = await makePayment(FEES, AMINA);

    await reconciliation.reconcilePayment(SCHOOL, paymentId);
    const second = await reconciliation.reconcilePayment(SCHOOL, paymentId);
    const third = await reconciliation.reconcilePayment(SCHOOL, paymentId);

    expect(second).toEqual({ result: "already_reconciled" });
    expect(third).toEqual({ result: "already_reconciled" });

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(invoice.amountPaidMinor).toBe(FEES);
    expect(await prisma.reconciliationMatch.count({ where: { paymentId } })).toBe(1);
  });

  it("treats two genuinely separate payments as two allocations", async () => {
    const invoiceId = await makeInvoice(AMINA, FEES, 10);
    const first = await makePayment(20_000_00n, AMINA);
    const second = await makePayment(25_000_00n, AMINA);

    await reconciliation.reconcilePayment(SCHOOL, first);
    await reconciliation.reconcilePayment(SCHOOL, second);

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(invoice.amountPaidMinor).toBe(FEES);
    expect(invoice.status).toBe("PAID");
  });
});

d("the review queue", () => {
  it("proposes rather than applies when the evidence is ambiguous", async () => {
    await makeInvoice(MUKASA_A, FEES, 10);
    await makeInvoice(MUKASA_B, FEES, 10);
    // Reference carries neither code — only the shared name is available.
    const paymentId = await makePayment(FEES, null, "SOMAJOHNMUKASA1");

    const outcome = await reconciliation.reconcilePayment(SCHOOL, paymentId);
    expect(outcome.result).not.toBe("auto_confirmed");

    // Nothing moved onto any invoice.
    const invoices = await prisma.invoice.findMany({ where: { schoolId: SCHOOL } });
    for (const invoice of invoices) expect(invoice.amountPaidMinor).toBe(0n);
  });

  it("writes its own proposal when confidence lands in the review band", async () => {
    const invoiceId = await makeInvoice(SARAH, FEES, 10);
    const paymentId = await makePayment(FEES, null, "SOMAAB1234XYZAB");

    const outcome = await reconciliation.reconcilePayment(SCHOOL, paymentId);
    expect(outcome).toMatchObject({ result: "needs_review", studentId: SARAH });

    // The proposal is queued, and not a shilling has moved.
    const queue = await reconciliation.reviewQueue(SCHOOL);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      status: "PROPOSED",
      studentId: SARAH,
      strategy: "code_in_narration",
    });
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } })).amountPaidMinor).toBe(0n);

    // The audit records why it hesitated, before any human touched it.
    const trail = await reconciliation.auditTrail(SCHOOL, paymentId);
    expect(trail[0]).toMatchObject({ event: "MATCH_PROPOSED" });
    expect(trail[0]!.detail).toMatchObject({ strategy: "code_in_narration" });
  });

  it("moves money only once a bursar confirms", async () => {
    const invoiceId = await makeInvoice(AMINA, FEES, 10);
    const paymentId = await makePayment(FEES, null, "SOMAAMINANAKATO");

    await prisma.reconciliationMatch.create({
      data: {
        schoolId: SCHOOL,
        paymentId,
        invoiceId,
        studentId: AMINA,
        method: "AUTO",
        strategy: "fuzzy_name",
        confidence: 0.82,
        evidence: "Name resembles Amina Nakato",
        amountMinor: FEES,
        status: "PROPOSED",
      },
    });

    const queue = await reconciliation.reviewQueue(SCHOOL);
    expect(queue).toHaveLength(1);
    expect(queue[0]!.evidence).toContain("Amina Nakato");
    // Still untouched while it waits.
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } })).amountPaidMinor).toBe(0n);

    await reconciliation.confirmMatch(SCHOOL, queue[0]!.id, BURSAR);

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(invoice.amountPaidMinor).toBe(FEES);
    expect(invoice.status).toBe("PAID");

    const confirmed = await prisma.reconciliationMatch.findUniqueOrThrow({
      where: { id: queue[0]!.id },
    });
    expect(confirmed).toMatchObject({ status: "CONFIRMED", method: "MANUAL", reviewedBy: BURSAR });
  });

  it("moves no money when a bursar rejects", async () => {
    const invoiceId = await makeInvoice(AMINA, FEES, 10);
    const paymentId = await makePayment(FEES, null, "SOMAREJECTME123");
    const match = await prisma.reconciliationMatch.create({
      data: {
        schoolId: SCHOOL,
        paymentId,
        invoiceId,
        studentId: AMINA,
        method: "AUTO",
        strategy: "fuzzy_name",
        confidence: 0.75,
        evidence: "Weak name resemblance",
        amountMinor: FEES,
        status: "PROPOSED",
      },
    });

    await reconciliation.rejectMatch(SCHOOL, match.id, BURSAR, "Payer is a different family");

    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } })).amountPaidMinor).toBe(0n);
    const rejected = await prisma.reconciliationMatch.findUniqueOrThrow({ where: { id: match.id } });
    expect(rejected).toMatchObject({ status: "REJECTED", reviewedBy: BURSAR });

    const trail = await reconciliation.auditTrail(SCHOOL, paymentId);
    expect(trail.at(-1)).toMatchObject({ event: "MATCH_REJECTED", actorId: BURSAR });
    expect(trail.at(-1)!.detail).toMatchObject({ reason: "Payer is a different family" });
  });

  it("refuses to review the same match twice", async () => {
    const invoiceId = await makeInvoice(AMINA, FEES, 10);
    const paymentId = await makePayment(FEES, null, "SOMADOUBLEREV1");
    const match = await prisma.reconciliationMatch.create({
      data: {
        schoolId: SCHOOL,
        paymentId,
        invoiceId,
        studentId: AMINA,
        method: "AUTO",
        strategy: "fuzzy_name",
        confidence: 0.8,
        evidence: "e",
        amountMinor: FEES,
        status: "PROPOSED",
      },
    });

    await reconciliation.confirmMatch(SCHOOL, match.id, BURSAR);
    await expect(reconciliation.confirmMatch(SCHOOL, match.id, BURSAR)).rejects.toThrow(
      /already been reviewed/,
    );
    await expect(reconciliation.rejectMatch(SCHOOL, match.id, BURSAR, "no")).rejects.toThrow(
      /already been reviewed/,
    );

    // The double confirm must not have doubled the money.
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } })).amountPaidMinor).toBe(FEES);
  });
});

d("tenant isolation", () => {
  it("will not reconcile another school's payment", async () => {
    const paymentId = await makePayment(FEES, AMINA);
    const outcome = await reconciliation.reconcilePayment(OTHER_SCHOOL, paymentId);
    expect(outcome).toMatchObject({ result: "unmatched" });
  });

  it("will not confirm another school's match", async () => {
    const invoiceId = await makeInvoice(AMINA, FEES, 10);
    const paymentId = await makePayment(FEES, null, "SOMAOTHERSCHOOL");
    const match = await prisma.reconciliationMatch.create({
      data: {
        schoolId: SCHOOL,
        paymentId,
        invoiceId,
        studentId: AMINA,
        method: "AUTO",
        strategy: "fuzzy_name",
        confidence: 0.8,
        evidence: "e",
        amountMinor: FEES,
        status: "PROPOSED",
      },
    });

    await expect(reconciliation.confirmMatch(OTHER_SCHOOL, match.id, BURSAR)).rejects.toThrow(
      /not found/i,
    );
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } })).amountPaidMinor).toBe(0n);
  });

  it("shows only this school's review queue and unmatched payments", async () => {
    await makePayment(FEES, null, "SOMAUNMATCHED01");
    expect(await reconciliation.reviewQueue(OTHER_SCHOOL)).toHaveLength(0);
    expect(await reconciliation.unmatchedPayments(OTHER_SCHOOL)).toHaveLength(0);
    expect((await reconciliation.unmatchedPayments(SCHOOL)).length).toBeGreaterThan(0);
  });
});

d("the audit trail is immutable", () => {
  it("rejects updates and deletes at the database", async () => {
    await makeInvoice(AMINA, FEES, 10);
    const paymentId = await makePayment(FEES, AMINA);
    await reconciliation.reconcilePayment(SCHOOL, paymentId);

    await expect(
      prisma.$executeRawUnsafe(`UPDATE "ReconciliationAudit" SET "event" = 'MATCH_REJECTED'`),
    ).rejects.toThrow(/append-only/);
    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM "ReconciliationAudit"`),
    ).rejects.toThrow(/append-only/);
  });

  it("keeps the trail after the payment it describes is gone", async () => {
    await makeInvoice(AMINA, FEES, 10);
    const paymentId = await makePayment(FEES, AMINA);
    await reconciliation.reconcilePayment(SCHOOL, paymentId);

    await prisma.reconciliationMatch.deleteMany({ where: { paymentId } });
    await prisma.payment.delete({ where: { id: paymentId } });

    // The dispute answer survives the records it refers to.
    expect(await reconciliation.auditTrail(SCHOOL, paymentId)).toHaveLength(1);
  });
});

d("balances and arrears", () => {
  it("reports what a student owes across terms", async () => {
    await makeInvoice(AMINA, 30_000_00n, 100);
    await makeInvoice(AMINA, 20_000_00n, 10);
    const paymentId = await makePayment(35_000_00n, AMINA);
    await reconciliation.reconcilePayment(SCHOOL, paymentId);

    const balance = await invoicing.studentBalance(SCHOOL, AMINA);
    expect(balance.billedMinor).toBe(50_000_00n);
    expect(balance.paidMinor).toBe(35_000_00n);
    expect(balance.outstandingMinor).toBe(15_000_00n);
  });

  it("buckets outstanding money by age", async () => {
    await makeInvoice(AMINA, 10_000_00n, 5);
    await makeInvoice(JOSEPH, 20_000_00n, 120);

    const aging = await invoicing.arrearsAging(SCHOOL);
    const byBucket = Object.fromEntries(aging.buckets.map((b) => [b.bucket, b.amountMinor]));
    expect(byBucket["1-30"]).toBe(10_000_00n);
    expect(byBucket["90+"]).toBe(20_000_00n);
    expect(aging.totalMinor).toBe(30_000_00n);
  });

  it("ranks students by what they owe", async () => {
    await makeInvoice(AMINA, 10_000_00n, 5);
    await makeInvoice(JOSEPH, 40_000_00n, 60);

    const rows = await invoicing.arrearsByStudent(SCHOOL);
    expect(rows[0]).toMatchObject({ studentId: JOSEPH, outstandingMinor: 40_000_00n });
    expect(rows[1]).toMatchObject({ studentId: AMINA, outstandingMinor: 10_000_00n });
  });
});
