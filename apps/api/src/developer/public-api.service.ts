import { randomBytes } from "node:crypto";
import { DomainError } from "@soma/core";
import type { SomaPrismaClient } from "@soma/db";

export class ResourceNotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
  constructor(resource: string) {
    super(`${resource} not found`);
  }
}

/** Cursor pagination: stable under inserts, unlike offset. */
export interface Page<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

const MAX_LIMIT = 100;

function paginate<T extends { id: string }>(rows: T[], limit: number): Page<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  return {
    data,
    hasMore,
    nextCursor: hasMore ? (data.at(-1)?.id ?? null) : null,
  };
}

function cursorArgs(cursor?: string) {
  return cursor ? { cursor: { id: cursor }, skip: 1 } : {};
}

/**
 * The public v1 surface (CLAUDE.md §7 F12).
 *
 * Every method takes the schoolId resolved from the API key, so a key can
 * only ever read its own tenant — and because a sandbox is a TEST-mode
 * school, a test key reaching live data would require crossing the same
 * tenant boundary that everything else already enforces.
 */
export class PublicApiService {
  constructor(private readonly prisma: SomaPrismaClient) {}

  async listStudents(schoolId: string, limit: number, cursor?: string) {
    const rows = await this.prisma.student.findMany({
      where: { schoolId },
      orderBy: { id: "asc" },
      take: Math.min(limit, MAX_LIMIT) + 1,
      ...cursorArgs(cursor),
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        className: true,
        externalRef: true,
        regNumber: true,
        status: true,
      },
    });
    return paginate(rows, Math.min(limit, MAX_LIMIT));
  }

  async getStudent(schoolId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        className: true,
        externalRef: true,
        regNumber: true,
        status: true,
      },
    });
    if (!student) throw new ResourceNotFoundError("Student");
    return student;
  }

  async listInvoices(schoolId: string, limit: number, cursor?: string, studentId?: string) {
    const rows = await this.prisma.invoice.findMany({
      where: { schoolId, ...(studentId ? { studentId } : {}) },
      orderBy: { id: "asc" },
      take: Math.min(limit, MAX_LIMIT) + 1,
      ...cursorArgs(cursor),
      select: {
        id: true,
        studentId: true,
        term: true,
        amountDueMinor: true,
        amountPaidMinor: true,
        currency: true,
        dueDate: true,
        status: true,
      },
    });
    return paginate(rows, Math.min(limit, MAX_LIMIT));
  }

  async listPayments(schoolId: string, limit: number, cursor?: string) {
    const rows = await this.prisma.payment.findMany({
      where: { schoolId },
      orderBy: { id: "asc" },
      take: Math.min(limit, MAX_LIMIT) + 1,
      ...cursorArgs(cursor),
      select: {
        id: true,
        somaRef: true,
        studentId: true,
        amountMinor: true,
        currency: true,
        channel: true,
        status: true,
        receiptNo: true,
        paidAt: true,
        createdAt: true,
      },
    });
    return paginate(rows, Math.min(limit, MAX_LIMIT));
  }

  async getPayment(schoolId: string, somaRef: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { somaRef, schoolId },
      select: {
        id: true,
        somaRef: true,
        studentId: true,
        amountMinor: true,
        currency: true,
        channel: true,
        status: true,
        receiptNo: true,
        paidAt: true,
        createdAt: true,
      },
    });
    if (!payment) throw new ResourceNotFoundError("Payment");
    return payment;
  }

  // ── webhook management ───────────────────────────────────────────────────

  /** Endpoint list. The signing secret is never returned after creation. */
  listEndpoints(schoolId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, enabled: true, createdAt: true },
    });
  }

  /**
   * Register an endpoint. The secret is shown once — a developer who loses it
   * rotates the endpoint rather than reading it back.
   */
  async createEndpoint(schoolId: string, url: string) {
    const secret = `whsec_${randomBytes(24).toString("base64url")}`;
    const endpoint = await this.prisma.webhookEndpoint.create({
      data: { schoolId, url, secret },
      select: { id: true, url: true, enabled: true, createdAt: true },
    });
    return { ...endpoint, secret };
  }

  async deleteEndpoint(schoolId: string, id: string): Promise<void> {
    const deleted = await this.prisma.webhookEndpoint.deleteMany({ where: { id, schoolId } });
    if (deleted.count === 0) throw new ResourceNotFoundError("Endpoint");
  }

  /**
   * Delivery log — what was sent, how many attempts, and why it failed.
   * This is what turns "your webhook is broken" into a two-minute diagnosis.
   */
  async listDeliveries(schoolId: string, limit: number, cursor?: string, status?: string) {
    const rows = await this.prisma.webhookDelivery.findMany({
      where: { schoolId, ...(status ? { status: status as never } : {}) },
      orderBy: { id: "asc" },
      take: Math.min(limit, MAX_LIMIT) + 1,
      ...cursorArgs(cursor),
      select: {
        id: true,
        endpointId: true,
        eventType: true,
        status: true,
        attempts: true,
        lastError: true,
        nextAttemptAt: true,
        deliveredAt: true,
        createdAt: true,
        idempotencyKey: true,
      },
    });
    return paginate(rows, Math.min(limit, MAX_LIMIT));
  }
}
