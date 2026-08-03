import { DomainError, agingBucket, summarizeAging, type Currency } from "@soma/core";
import type { SomaPrismaClient } from "@soma/db";

export class TermNotFoundError extends DomainError {
  readonly code = "TERM_NOT_FOUND";
  constructor() {
    super("Term not found");
  }
}

export class NoFeeStructureError extends DomainError {
  readonly code = "NO_FEE_STRUCTURE";
  constructor(className: string) {
    super(`No fee structure is defined for ${className} in this term`);
  }
}

export interface GeneratedInvoices {
  created: number;
  skipped: number;
  totalBilledMinor: bigint;
}

export interface StudentBalance {
  studentId: string;
  billedMinor: bigint;
  paidMinor: bigint;
  outstandingMinor: bigint;
  currency: Currency;
}

/**
 * Invoicing (CLAUDE.md §7 F8).
 *
 * Every read and write is scoped by schoolId taken from the caller's verified
 * session, never from request input.
 */
export class InvoicingService {
  constructor(
    private readonly prisma: SomaPrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Bill every actively enrolled student for a term, using each class's fee
   * structure. Re-running is safe: a student already invoiced for the term is
   * skipped rather than billed twice.
   */
  async generateTermInvoices(
    schoolId: string,
    termId: string,
    dueDate: Date,
  ): Promise<GeneratedInvoices> {
    const term = await this.prisma.term.findFirst({ where: { id: termId, schoolId } });
    if (!term) throw new TermNotFoundError();

    const school = await this.prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
      select: { currency: true },
    });

    const enrolments = await this.prisma.enrolment.findMany({
      where: { schoolId, termId, status: "ACTIVE" },
      include: { class: true },
    });

    const structures = await this.prisma.feeStructure.findMany({
      where: { schoolId, termId },
      include: { lines: { include: { feeItem: true } } },
    });
    const byClass = new Map(structures.map((s) => [s.classId, s]));

    let created = 0;
    let skipped = 0;
    let totalBilledMinor = 0n;

    for (const enrolment of enrolments) {
      const existing = await this.prisma.invoice.findFirst({
        where: { schoolId, studentId: enrolment.studentId, termId },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const structure = byClass.get(enrolment.classId);
      if (!structure) throw new NoFeeStructureError(enrolment.class.name);

      const lines = structure.lines
        .filter((line) => line.feeItem.active && line.feeItem.mandatory)
        .map((line) => ({
          description: line.feeItem.name,
          amountMinor: line.amountMinor ?? line.feeItem.amountMinor,
          feeItemId: line.feeItemId,
        }));

      const amountDueMinor = lines.reduce((sum, line) => sum + line.amountMinor, 0n);

      await this.prisma.invoice.create({
        data: {
          schoolId,
          studentId: enrolment.studentId,
          term: term.name,
          termId,
          amountDueMinor,
          currency: school.currency,
          dueDate,
          status: "ISSUED",
          lines: { create: lines },
        },
      });

      created++;
      totalBilledMinor += amountDueMinor;
    }

    return { created, skipped, totalBilledMinor };
  }

  /** What one student owes across every term. */
  async studentBalance(schoolId: string, studentId: string): Promise<StudentBalance> {
    const invoices = await this.prisma.invoice.findMany({
      where: { schoolId, studentId, status: { not: "VOID" } },
      select: { amountDueMinor: true, amountPaidMinor: true },
    });
    const school = await this.prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
      select: { currency: true },
    });

    const billedMinor = invoices.reduce((sum, i) => sum + i.amountDueMinor, 0n);
    const paidMinor = invoices.reduce((sum, i) => sum + i.amountPaidMinor, 0n);
    const outstanding = billedMinor - paidMinor;

    return {
      studentId,
      billedMinor,
      paidMinor,
      outstandingMinor: outstanding > 0n ? outstanding : 0n,
      currency: school.currency as Currency,
    };
  }

  /** Arrears aging across the school — the bursar's headline number. */
  async arrearsAging(schoolId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { schoolId, status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
      select: { id: true, amountDueMinor: true, amountPaidMinor: true, dueDate: true },
    });
    const school = await this.prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
      select: { currency: true },
    });

    return summarizeAging(
      invoices.map(({ id, ...rest }) => ({ invoiceId: id, ...rest })),
      this.now(),
      school.currency as Currency,
    );
  }

  /** Students with money outstanding, worst arrears first. */
  async arrearsByStudent(schoolId: string, limit = 100) {
    const invoices = await this.prisma.invoice.findMany({
      where: { schoolId, status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
      include: { student: { select: { firstName: true, lastName: true, className: true } } },
    });

    const byStudent = new Map<
      string,
      { studentId: string; name: string; className: string | null; outstandingMinor: bigint; oldestDue: Date }
    >();

    for (const invoice of invoices) {
      const owed = invoice.amountDueMinor - invoice.amountPaidMinor;
      if (owed <= 0n) continue;

      const existing = byStudent.get(invoice.studentId);
      if (existing) {
        existing.outstandingMinor += owed;
        if (invoice.dueDate < existing.oldestDue) existing.oldestDue = invoice.dueDate;
      } else {
        byStudent.set(invoice.studentId, {
          studentId: invoice.studentId,
          name: `${invoice.student.firstName} ${invoice.student.lastName}`,
          className: invoice.student.className,
          outstandingMinor: owed,
          oldestDue: invoice.dueDate,
        });
      }
    }

    return [...byStudent.values()]
      .map((row) => ({ ...row, bucket: agingBucket(row.oldestDue, this.now()) }))
      .sort((a, b) => (b.outstandingMinor > a.outstandingMinor ? 1 : -1))
      .slice(0, limit);
  }
}
