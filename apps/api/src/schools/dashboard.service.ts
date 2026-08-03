import type { Currency } from "@soma/core";
import type { SomaPrismaClient } from "@soma/db";
import { formatMinor, toCsv } from "./csv.js";

export interface CollectionsPoint {
  date: string;
  amountMinor: bigint;
  paymentCount: number;
}

/**
 * Bursar reporting (CLAUDE.md §7 F10).
 * Every query is scoped by the caller's verified schoolId.
 */
export class DashboardService {
  constructor(
    private readonly prisma: SomaPrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Headline figures for the dashboard. */
  async summary(schoolId: string) {
    const [invoices, payments, reviewCount, unmatchedCount, school] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { schoolId, status: { not: "VOID" } },
        select: { amountDueMinor: true, amountPaidMinor: true },
      }),
      this.prisma.payment.aggregate({
        where: { schoolId, status: "SUCCEEDED" },
        _sum: { amountMinor: true },
        _count: true,
      }),
      this.prisma.reconciliationMatch.count({ where: { schoolId, status: "PROPOSED" } }),
      this.prisma.payment.count({
        where: {
          schoolId,
          status: "SUCCEEDED",
          matches: { none: { status: { in: ["PROPOSED", "CONFIRMED"] } } },
        },
      }),
      this.prisma.school.findUniqueOrThrow({
        where: { id: schoolId },
        select: { currency: true },
      }),
    ]);

    const billedMinor = invoices.reduce((sum, i) => sum + i.amountDueMinor, 0n);
    const paidMinor = invoices.reduce((sum, i) => sum + i.amountPaidMinor, 0n);
    const outstanding = billedMinor - paidMinor;

    return {
      currency: school.currency as Currency,
      billedMinor,
      collectedMinor: paidMinor,
      outstandingMinor: outstanding > 0n ? outstanding : 0n,
      collectionRate: billedMinor > 0n ? Number((paidMinor * 10000n) / billedMinor) / 100 : 0,
      paymentsReceived: payments._count,
      paymentsValueMinor: payments._sum.amountMinor ?? 0n,
      awaitingReview: reviewCount,
      unmatchedPayments: unmatchedCount,
    };
  }

  /** Collections per day over a window. */
  async collectionsOverTime(schoolId: string, days = 30): Promise<CollectionsPoint[]> {
    const since = new Date(this.now().getTime() - days * 86_400_000);
    const payments = await this.prisma.payment.findMany({
      where: { schoolId, status: "SUCCEEDED", paidAt: { gte: since } },
      select: { amountMinor: true, paidAt: true },
      orderBy: { paidAt: "asc" },
    });

    const byDay = new Map<string, { amountMinor: bigint; paymentCount: number }>();
    for (const payment of payments) {
      if (!payment.paidAt) continue;
      const key = payment.paidAt.toISOString().slice(0, 10);
      const entry = byDay.get(key) ?? { amountMinor: 0n, paymentCount: 0 };
      entry.amountMinor += payment.amountMinor;
      entry.paymentCount += 1;
      byDay.set(key, entry);
    }

    return [...byDay.entries()]
      .map(([date, value]) => ({ date, ...value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Billed, collected, and outstanding per class for a term. */
  async byClass(schoolId: string, termId: string) {
    const enrolments = await this.prisma.enrolment.findMany({
      where: { schoolId, termId, status: "ACTIVE" },
      include: { class: { select: { name: true, level: true } } },
    });
    const invoices = await this.prisma.invoice.findMany({
      where: { schoolId, termId, status: { not: "VOID" } },
      select: { studentId: true, amountDueMinor: true, amountPaidMinor: true },
    });

    const classOf = new Map(enrolments.map((e) => [e.studentId, e.class]));
    const totals = new Map<
      string,
      { className: string; level: number | null; billedMinor: bigint; paidMinor: bigint; students: number }
    >();

    for (const enrolment of enrolments) {
      const key = enrolment.class.name;
      if (!totals.has(key)) {
        totals.set(key, {
          className: key,
          level: enrolment.class.level,
          billedMinor: 0n,
          paidMinor: 0n,
          students: 0,
        });
      }
      totals.get(key)!.students += 1;
    }

    for (const invoice of invoices) {
      const cls = classOf.get(invoice.studentId);
      if (!cls) continue;
      const entry = totals.get(cls.name);
      if (!entry) continue;
      entry.billedMinor += invoice.amountDueMinor;
      entry.paidMinor += invoice.amountPaidMinor;
    }

    return [...totals.values()]
      .map((row) => ({ ...row, outstandingMinor: row.billedMinor - row.paidMinor }))
      .sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.className.localeCompare(b.className));
  }

  /** Arrears export a bursar can open in Excel and act on. */
  async arrearsCsv(schoolId: string): Promise<string> {
    const invoices = await this.prisma.invoice.findMany({
      where: { schoolId, status: { in: ["ISSUED", "PARTIALLY_PAID"] } },
      include: {
        student: {
          select: { firstName: true, lastName: true, externalRef: true, className: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    return toCsv(
      ["Payment code", "Student", "Class", "Term", "Due date", "Billed", "Paid", "Outstanding"],
      invoices.map((invoice) => [
        invoice.student.externalRef ?? "",
        `${invoice.student.firstName} ${invoice.student.lastName}`,
        invoice.student.className ?? "",
        invoice.term,
        invoice.dueDate.toISOString().slice(0, 10),
        formatMinor(invoice.amountDueMinor),
        formatMinor(invoice.amountPaidMinor),
        formatMinor(invoice.amountDueMinor - invoice.amountPaidMinor),
      ]),
    );
  }

  /** Payments export with their reconciliation state. */
  async paymentsCsv(schoolId: string, days = 90): Promise<string> {
    const since = new Date(this.now().getTime() - days * 86_400_000);
    const payments = await this.prisma.payment.findMany({
      where: { schoolId, status: "SUCCEEDED", paidAt: { gte: since } },
      include: {
        student: { select: { firstName: true, lastName: true, externalRef: true } },
        matches: { where: { status: "CONFIRMED" }, select: { amountMinor: true } },
      },
      orderBy: { paidAt: "desc" },
    });

    return toCsv(
      ["Reference", "Receipt", "Paid at", "Channel", "Amount", "Allocated", "Student", "Payment code", "Status"],
      payments.map((payment) => {
        const allocated = payment.matches.reduce((sum, m) => sum + m.amountMinor, 0n);
        return [
          payment.somaRef,
          payment.receiptNo ?? "",
          payment.paidAt?.toISOString() ?? "",
          payment.channel,
          formatMinor(payment.amountMinor),
          formatMinor(allocated),
          payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : "",
          payment.student?.externalRef ?? "",
          allocated === 0n ? "UNMATCHED" : allocated < payment.amountMinor ? "PARTIAL" : "ALLOCATED",
        ];
      }),
    );
  }
}
