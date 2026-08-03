import {
  DomainError,
  matchPayment,
  planAllocation,
  type CandidateScore,
  type OutstandingInvoice,
  type PaymentSignal,
  type StudentCandidate,
} from "@soma/core";
import type { SomaPrismaClient } from "@soma/db";

export class MatchNotFoundError extends DomainError {
  readonly code = "MATCH_NOT_FOUND";
  constructor() {
    super("Match not found");
  }
}

export class MatchAlreadyReviewedError extends DomainError {
  readonly code = "MATCH_ALREADY_REVIEWED";
  constructor() {
    super("This match has already been reviewed");
  }
}

export type ReconcileOutcome =
  | { result: "auto_confirmed"; studentId: string; allocated: number }
  | { result: "needs_review"; studentId: string; reason: string }
  | { result: "unmatched"; reason: string }
  | { result: "already_reconciled" };

/**
 * The reconciliation engine (CLAUDE.md §7 F9).
 *
 * The deciding is done by the pure matcher in @soma/core; this class supplies
 * candidates, persists the decision, moves money onto invoices, and writes the
 * audit trail. Keeping those jobs apart is what lets the decision logic be
 * tested adversarially without a database.
 */
export class ReconciliationService {
  constructor(
    private readonly prisma: SomaPrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Reconcile one succeeded payment.
   *
   * A payment that already has confirmed matches is left alone — this is what
   * makes the engine safe to re-run over a whole term, and what stops a
   * duplicate receipt from being allocated twice.
   */
  async reconcilePayment(schoolId: string, paymentId: string): Promise<ReconcileOutcome> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, schoolId, status: "SUCCEEDED" },
    });
    if (!payment) return { result: "unmatched", reason: "No succeeded payment with that id" };

    const existing = await this.prisma.reconciliationMatch.count({
      where: { paymentId, status: { in: ["PROPOSED", "CONFIRMED"] } },
    });
    if (existing > 0) return { result: "already_reconciled" };

    const signal: PaymentSignal = {
      // The payer's own code travels in the narration on these rails; the
      // student link, when the payment carries one, is stronger still.
      paymentCode: payment.studentId ? null : null,
      narration: `${payment.somaRef} ${payment.receiptNo ?? ""}`.trim(),
      payerName: null,
    };

    // A payment that already knows its student (the payer used the two-step
    // flow) skips matching entirely — there is nothing to guess.
    if (payment.studentId) {
      const allocated = await this.allocate(
        schoolId,
        payment.id,
        payment.studentId,
        payment.amountMinor,
        { strategy: "payment_code", confidence: 1, evidence: "Payer identified the student at checkout" },
        "AUTO",
        null,
      );
      return { result: "auto_confirmed", studentId: payment.studentId, allocated };
    }

    const candidates = await this.candidatesFor(schoolId);
    const outcome = matchPayment(signal, candidates);

    if (outcome.decision === "unmatched") {
      await this.audit(schoolId, "PAYMENT_UNMATCHED", {
        paymentId,
        detail: { reason: outcome.reason, considered: candidates.length },
      });
      return { result: "unmatched", reason: outcome.reason };
    }

    const { best } = outcome;
    if (outcome.decision === "review") {
      await this.proposeForReview(schoolId, payment.id, payment.amountMinor, best, outcome.reason, outcome.runnerUp);
      return { result: "needs_review", studentId: best.studentId, reason: outcome.reason };
    }

    const allocated = await this.allocate(
      schoolId,
      payment.id,
      best.studentId,
      payment.amountMinor,
      best,
      "AUTO",
      null,
    );
    return { result: "auto_confirmed", studentId: best.studentId, allocated };
  }

  /** Everything a bursar needs to decide, oldest first. */
  async reviewQueue(schoolId: string, limit = 50) {
    return this.prisma.reconciliationMatch.findMany({
      where: { schoolId, status: "PROPOSED" },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: {
        payment: { select: { somaRef: true, amountMinor: true, currency: true, paidAt: true } },
        invoice: { select: { term: true, dueDate: true, amountDueMinor: true, amountPaidMinor: true } },
      },
    });
  }

  /** A bursar accepts a proposed match; the money moves onto the invoice. */
  async confirmMatch(schoolId: string, matchId: string, actorId: string): Promise<void> {
    const match = await this.prisma.reconciliationMatch.findFirst({
      where: { id: matchId, schoolId },
    });
    if (!match) throw new MatchNotFoundError();
    if (match.status !== "PROPOSED") throw new MatchAlreadyReviewedError();

    await this.prisma.$transaction(async (tx) => {
      await tx.reconciliationMatch.update({
        where: { id: matchId },
        data: {
          status: "CONFIRMED",
          method: "MANUAL",
          reviewedBy: actorId,
          reviewedAt: this.now(),
        },
      });
      await this.applyToInvoice(tx, match.invoiceId, match.amountMinor);
      await tx.reconciliationAudit.create({
        data: {
          schoolId,
          paymentId: match.paymentId,
          invoiceId: match.invoiceId,
          studentId: match.studentId,
          matchId,
          event: "MATCH_CONFIRMED",
          actorId,
          detail: {
            confidence: match.confidence,
            strategy: match.strategy,
            amountMinor: match.amountMinor.toString(),
          },
        },
      });
    });
  }

  /** A bursar rejects a proposal. Nothing moves; the payment returns to unmatched. */
  async rejectMatch(
    schoolId: string,
    matchId: string,
    actorId: string,
    reason: string,
  ): Promise<void> {
    const match = await this.prisma.reconciliationMatch.findFirst({
      where: { id: matchId, schoolId },
    });
    if (!match) throw new MatchNotFoundError();
    if (match.status !== "PROPOSED") throw new MatchAlreadyReviewedError();

    await this.prisma.$transaction(async (tx) => {
      await tx.reconciliationMatch.update({
        where: { id: matchId },
        data: { status: "REJECTED", reviewedBy: actorId, reviewedAt: this.now() },
      });
      await tx.reconciliationAudit.create({
        data: {
          schoolId,
          paymentId: match.paymentId,
          invoiceId: match.invoiceId,
          studentId: match.studentId,
          matchId,
          event: "MATCH_REJECTED",
          actorId,
          detail: { reason, confidence: match.confidence, strategy: match.strategy },
        },
      });
    });
  }

  /** Payments that reconciled to nobody — the bursar's other worklist. */
  async unmatchedPayments(schoolId: string, limit = 50) {
    return this.prisma.payment.findMany({
      where: {
        schoolId,
        status: "SUCCEEDED",
        matches: { none: { status: { in: ["PROPOSED", "CONFIRMED"] } } },
      },
      orderBy: { paidAt: "asc" },
      take: limit,
      select: { id: true, somaRef: true, amountMinor: true, currency: true, paidAt: true, payerPhone: true },
    });
  }

  /** The full decision history for one payment — the dispute answer. */
  async auditTrail(schoolId: string, paymentId: string) {
    return this.prisma.reconciliationAudit.findMany({
      where: { schoolId, paymentId },
      orderBy: { createdAt: "asc" },
    });
  }

  // ── internals ────────────────────────────────────────────────────────────

  private async candidatesFor(schoolId: string): Promise<StudentCandidate[]> {
    const students = await this.prisma.student.findMany({
      where: { schoolId, status: "ENROLLED" },
      select: {
        id: true,
        externalRef: true,
        regNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
      },
    });

    return students.map((s) => ({
      studentId: s.id,
      paymentCode: s.externalRef,
      regNumber: s.regNumber,
      fullName: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" "),
    }));
  }

  private async openInvoicesFor(
    schoolId: string,
    studentId: string,
  ): Promise<OutstandingInvoice[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: { schoolId, studentId, status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
      select: { id: true, amountDueMinor: true, amountPaidMinor: true, dueDate: true },
    });
    return invoices.map(({ id, ...rest }) => ({ invoiceId: id, ...rest }));
  }

  /**
   * Spread a payment across the student's open invoices and record the result.
   * Returns how many invoices received money.
   */
  private async allocate(
    schoolId: string,
    paymentId: string,
    studentId: string,
    amountMinor: bigint,
    score: Pick<CandidateScore, "confidence" | "strategy" | "evidence">,
    method: "AUTO" | "MANUAL",
    actorId: string | null,
  ): Promise<number> {
    const open = await this.openInvoicesFor(schoolId, studentId);
    const plan = planAllocation(amountMinor, open);

    if (plan.allocations.length === 0) {
      await this.audit(schoolId, "PAYMENT_UNMATCHED", {
        paymentId,
        studentId,
        detail: {
          reason: "Student matched but has no open invoice",
          creditMinor: plan.creditMinor.toString(),
        },
      });
      return 0;
    }

    await this.prisma.$transaction(async (tx) => {
      for (const allocation of plan.allocations) {
        await tx.reconciliationMatch.create({
          data: {
            schoolId,
            paymentId,
            invoiceId: allocation.invoiceId,
            studentId,
            method,
            strategy: score.strategy,
            confidence: score.confidence,
            evidence: score.evidence,
            amountMinor: allocation.amountMinor,
            status: "CONFIRMED",
            ...(actorId ? { reviewedBy: actorId, reviewedAt: this.now() } : {}),
          },
        });
        await this.applyToInvoice(tx, allocation.invoiceId, allocation.amountMinor);
      }

      await tx.reconciliationAudit.create({
        data: {
          schoolId,
          paymentId,
          studentId,
          event: method === "AUTO" ? "MATCH_AUTO_CONFIRMED" : "MATCH_CONFIRMED",
          actorId,
          detail: {
            confidence: score.confidence,
            strategy: score.strategy,
            evidence: score.evidence,
            allocations: plan.allocations.map((a) => ({
              invoiceId: a.invoiceId,
              amountMinor: a.amountMinor.toString(),
              settles: a.settles,
            })),
            creditMinor: plan.creditMinor.toString(),
            partial: plan.partial,
          },
        },
      });
    });

    return plan.allocations.length;
  }

  private async proposeForReview(
    schoolId: string,
    paymentId: string,
    amountMinor: bigint,
    best: CandidateScore,
    reason: string,
    runnerUp?: CandidateScore,
  ): Promise<void> {
    const open = await this.openInvoicesFor(schoolId, best.studentId);
    const plan = planAllocation(amountMinor, open);

    if (plan.allocations.length === 0) {
      await this.audit(schoolId, "PAYMENT_UNMATCHED", {
        paymentId,
        studentId: best.studentId,
        detail: { reason: "Candidate has no open invoice", matchReason: reason },
      });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      for (const allocation of plan.allocations) {
        await tx.reconciliationMatch.create({
          data: {
            schoolId,
            paymentId,
            invoiceId: allocation.invoiceId,
            studentId: best.studentId,
            method: "AUTO",
            strategy: best.strategy,
            confidence: best.confidence,
            evidence: best.evidence,
            amountMinor: allocation.amountMinor,
            status: "PROPOSED",
          },
        });
      }
      await tx.reconciliationAudit.create({
        data: {
          schoolId,
          paymentId,
          studentId: best.studentId,
          event: "MATCH_PROPOSED",
          detail: {
            reason,
            confidence: best.confidence,
            strategy: best.strategy,
            evidence: best.evidence,
            ...(runnerUp
              ? {
                  runnerUp: {
                    studentId: runnerUp.studentId,
                    confidence: runnerUp.confidence,
                    evidence: runnerUp.evidence,
                  },
                }
              : {}),
          },
        },
      });
    });
  }

  /** Move money onto an invoice and advance its status. */
  private async applyToInvoice(
    tx: Parameters<Parameters<SomaPrismaClient["$transaction"]>[0]>[0],
    invoiceId: string,
    amountMinor: bigint,
  ): Promise<void> {
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    const paid = invoice.amountPaidMinor + amountMinor;

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaidMinor: paid,
        status: paid >= invoice.amountDueMinor ? "PAID" : "PARTIALLY_PAID",
      },
    });
  }

  private async audit(
    schoolId: string,
    event: "PAYMENT_UNMATCHED" | "ALLOCATION_APPLIED",
    fields: {
      paymentId?: string;
      invoiceId?: string;
      studentId?: string;
      detail: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.prisma.reconciliationAudit.create({
      data: {
        schoolId,
        event,
        paymentId: fields.paymentId ?? null,
        invoiceId: fields.invoiceId ?? null,
        studentId: fields.studentId ?? null,
        detail: fields.detail as object,
      },
    });
  }
}
