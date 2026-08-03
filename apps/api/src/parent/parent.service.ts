import { DomainError } from "@soma/core";
import type { SomaPrismaClient } from "@soma/db";
import type { PaymentChannel, PaymentsService } from "../payments/payments.service.js";

export class ChildNotLinkedError extends DomainError {
  readonly code = "CHILD_NOT_LINKED";
  constructor() {
    // Same message whether the student does not exist or simply is not this
    // parent's child — the difference would leak enrolment.
    super("That child is not linked to your account");
  }
}

export class ReceiptNotFoundError extends DomainError {
  readonly code = "RECEIPT_NOT_FOUND";
  constructor() {
    super("Receipt not found");
  }
}

export interface LinkedChild {
  studentId: string;
  firstName: string;
  lastName: string;
  className: string | null;
  schoolId: string;
  schoolName: string;
  currency: string;
  billedMinor: bigint;
  paidMinor: bigint;
  outstandingMinor: bigint;
}

/**
 * The parent-facing read and pay surface (CLAUDE.md §7 F11).
 *
 * Authorization here is by linkage, never by tenant: a parent sees exactly
 * the students joined to them through Guardian → GuardianStudent, across
 * however many schools that spans, and nothing else.
 */
export class ParentService {
  constructor(
    private readonly prisma: SomaPrismaClient,
    private readonly payments: PaymentsService,
  ) {}

  /** Every child this parent is linked to, at every school. */
  async children(identityId: string): Promise<LinkedChild[]> {
    const links = await this.prisma.guardianStudent.findMany({
      where: { guardian: { identityId } },
      include: {
        student: {
          include: {
            school: { select: { id: true, name: true, currency: true } },
            invoices: {
              where: { status: { not: "VOID" } },
              select: { amountDueMinor: true, amountPaidMinor: true },
            },
          },
        },
      },
    });

    // A child linked through two guardian records at the same school would
    // otherwise appear twice.
    const seen = new Map<string, LinkedChild>();
    for (const link of links) {
      const student = link.student;
      if (seen.has(student.id)) continue;

      const billedMinor = student.invoices.reduce((sum, i) => sum + i.amountDueMinor, 0n);
      const paidMinor = student.invoices.reduce((sum, i) => sum + i.amountPaidMinor, 0n);
      const outstanding = billedMinor - paidMinor;

      seen.set(student.id, {
        studentId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        className: student.className,
        schoolId: student.school.id,
        schoolName: student.school.name,
        currency: student.school.currency,
        billedMinor,
        paidMinor,
        outstandingMinor: outstanding > 0n ? outstanding : 0n,
      });
    }

    return [...seen.values()].sort(
      (a, b) => a.schoolName.localeCompare(b.schoolName) || a.firstName.localeCompare(b.firstName),
    );
  }

  /** Open invoices for one child, oldest first. */
  async invoicesFor(identityId: string, studentId: string) {
    const student = await this.assertLinked(identityId, studentId);

    const invoices = await this.prisma.invoice.findMany({
      where: { studentId, schoolId: student.schoolId, status: { not: "VOID" } },
      orderBy: { dueDate: "asc" },
      include: { lines: { select: { description: true, amountMinor: true } } },
    });

    return invoices.map((invoice) => ({
      invoiceId: invoice.id,
      term: invoice.term,
      dueDate: invoice.dueDate,
      status: invoice.status,
      currency: invoice.currency,
      amountDueMinor: invoice.amountDueMinor,
      amountPaidMinor: invoice.amountPaidMinor,
      outstandingMinor:
        invoice.amountDueMinor - invoice.amountPaidMinor > 0n
          ? invoice.amountDueMinor - invoice.amountPaidMinor
          : 0n,
      lines: invoice.lines,
    }));
  }

  /** Payment history across every child and school. */
  async paymentHistory(identityId: string, limit = 50) {
    const studentIds = await this.linkedStudentIds(identityId);
    if (studentIds.length === 0) return [];

    const payments = await this.prisma.payment.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        student: { select: { firstName: true, lastName: true } },
        school: { select: { name: true } },
      },
    });

    return payments.map((payment) => ({
      somaReference: payment.somaRef,
      receiptNo: payment.receiptNo,
      status: payment.status,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      channel: payment.channel,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      childName: `${payment.student?.firstName ?? ""} ${payment.student?.lastName ?? ""}`.trim(),
      schoolName: payment.school.name,
    }));
  }

  /**
   * A receipt for a settled payment.
   *
   * Looked up by Soma reference — an opaque token, so no name or phone
   * travels in the URL (CLAUDE.md §8.2). Ownership is still checked.
   */
  async receipt(identityId: string, somaReference: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { somaRef: somaReference },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, className: true } },
        school: { select: { name: true } },
        matches: {
          where: { status: "CONFIRMED" },
          select: { amountMinor: true, invoice: { select: { term: true } } },
        },
      },
    });

    if (!payment?.student) throw new ReceiptNotFoundError();
    // Same error for "no such receipt" and "not yours".
    const linked = await this.linkedStudentIds(identityId);
    if (!linked.includes(payment.student.id)) throw new ReceiptNotFoundError();
    if (payment.status !== "SUCCEEDED") throw new ReceiptNotFoundError();

    return {
      somaReference: payment.somaRef,
      receiptNo: payment.receiptNo,
      paidAt: payment.paidAt,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      channel: payment.channel,
      schoolName: payment.school.name,
      childName: `${payment.student.firstName} ${payment.student.lastName}`,
      className: payment.student.className,
      allocations: payment.matches.map((m) => ({
        term: m.invoice.term,
        amountMinor: m.amountMinor,
      })),
    };
  }

  /**
   * Pay for one child.
   *
   * Proves linkage, then hands off to the payments context. No money logic
   * lives here — there is one place that creates a Payment and calls a rail.
   */
  async pay(
    identityId: string,
    studentId: string,
    amountMinor: bigint,
    payerPhone: string,
    channel: PaymentChannel,
  ) {
    const student = await this.assertLinked(identityId, studentId);
    const guardian = await this.prisma.guardian.findFirst({
      where: { identityId, schoolId: student.schoolId },
      select: { name: true },
    });

    return this.payments.payForStudent({
      schoolId: student.schoolId,
      studentId,
      amountMinor,
      payerPhone,
      channel,
      payerName: guardian?.name ?? null,
    });
  }

  // ── internals ────────────────────────────────────────────────────────────

  private async linkedStudentIds(identityId: string): Promise<string[]> {
    const links = await this.prisma.guardianStudent.findMany({
      where: { guardian: { identityId } },
      select: { studentId: true },
    });
    return [...new Set(links.map((l) => l.studentId))];
  }

  private async assertLinked(
    identityId: string,
    studentId: string,
  ): Promise<{ schoolId: string }> {
    const link = await this.prisma.guardianStudent.findFirst({
      where: { studentId, guardian: { identityId } },
      select: { student: { select: { schoolId: true } } },
    });
    if (!link) throw new ChildNotLinkedError();
    return { schoolId: link.student.schoolId };
  }
}
