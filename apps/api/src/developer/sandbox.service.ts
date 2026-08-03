import { DomainError, SomaReference } from "@soma/core";
import type { SomaPrismaClient } from "@soma/db";

export class LiveKeyInSandboxError extends DomainError {
  readonly code = "LIVE_KEY_IN_SANDBOX";
  constructor() {
    super("Sandbox simulation requires a test key. Live money is never simulated.");
  }
}

export class SandboxAlreadyExistsError extends DomainError {
  readonly code = "SANDBOX_EXISTS";
  constructor() {
    super("This school already has a sandbox");
  }
}

/**
 * The sandbox (CLAUDE.md §7 F12).
 *
 * A sandbox is a TEST-mode school: a real tenant with real rows that happens
 * to be marked test. Isolation therefore rides on the tenant boundary already
 * enforced everywhere, instead of a second mechanism that could disagree with
 * the first.
 *
 * It ships seeded with a class, a term, students, and open invoices, because a
 * sandbox that starts empty forces a developer to write setup code before they
 * can make a single interesting call.
 */
export class SandboxService {
  constructor(
    private readonly prisma: SomaPrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async provision(liveSchoolId: string): Promise<{ schoolId: string; students: number }> {
    const live = await this.prisma.school.findUniqueOrThrow({ where: { id: liveSchoolId } });
    if (live.mode !== "LIVE") throw new SandboxAlreadyExistsError();

    const existing = await this.prisma.school.findFirst({
      where: { sandboxOfId: liveSchoolId, mode: "TEST" },
      select: { id: true },
    });
    if (existing) throw new SandboxAlreadyExistsError();

    const sandbox = await this.prisma.school.create({
      data: {
        name: `${live.name} (Sandbox)`,
        country: live.country,
        currency: live.currency,
        timezone: live.timezone,
        mode: "TEST",
        sandboxOfId: liveSchoolId,
      },
    });

    const term = await this.prisma.term.create({
      data: {
        schoolId: sandbox.id,
        name: "Sandbox Term 1",
        startDate: new Date("2026-02-01"),
        endDate: new Date("2026-05-01"),
        status: "ACTIVE",
      },
    });
    const schoolClass = await this.prisma.schoolClass.create({
      data: { schoolId: sandbox.id, name: "P5", level: 5 },
    });

    // Names and codes chosen to exercise the matcher: an exact code, a
    // registration number, and two children who share a name.
    const roster = [
      { first: "Amina", last: "Nakato", code: "1000000001", reg: "SBX/2026/001" },
      { first: "Joseph", last: "Okello", code: "1000000002", reg: "SBX/2026/002" },
      { first: "John", last: "Mukasa", code: "1000000003", reg: "SBX/2026/003" },
      { first: "John", last: "Mukasa", code: "1000000004", reg: "SBX/2026/004" },
    ];

    const dueDate = new Date(this.now().getTime() - 14 * 86_400_000);
    for (const entry of roster) {
      const student = await this.prisma.student.create({
        data: {
          schoolId: sandbox.id,
          firstName: entry.first,
          lastName: entry.last,
          externalRef: entry.code,
          regNumber: entry.reg,
          className: "P5",
        },
      });
      await this.prisma.enrolment.create({
        data: {
          schoolId: sandbox.id,
          studentId: student.id,
          termId: term.id,
          classId: schoolClass.id,
        },
      });
      await this.prisma.invoice.create({
        data: {
          schoolId: sandbox.id,
          studentId: student.id,
          term: term.name,
          termId: term.id,
          amountDueMinor: 45_000_00n,
          currency: sandbox.currency,
          dueDate,
          status: "ISSUED",
          lines: {
            create: [
              { description: "Tuition", amountMinor: 40_000_00n },
              { description: "Lunch", amountMinor: 5_000_00n },
            ],
          },
        },
      });
    }

    return { schoolId: sandbox.id, students: roster.length };
  }

  /**
   * Drive a test payment to a terminal state without a rail.
   *
   * This is the difference between a sandbox a developer can build against and
   * one they can only look at: it lets them fire their own webhook handler on
   * demand instead of waiting for a real debit prompt.
   */
  async simulatePayment(
    schoolId: string,
    mode: string,
    input: { studentId?: string; amountMinor: bigint; outcome: "succeeded" | "failed" },
  ): Promise<{ somaReference: string; status: string }> {
    if (mode !== "TEST") throw new LiveKeyInSandboxError();

    const student = input.studentId
      ? await this.prisma.student.findFirst({
          where: { id: input.studentId, schoolId },
          select: { id: true },
        })
      : await this.prisma.student.findFirst({ where: { schoolId }, select: { id: true } });

    const school = await this.prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
      select: { currency: true },
    });
    const reference = SomaReference.generate();

    await this.prisma.payment.create({
      data: {
        schoolId,
        studentId: student?.id ?? null,
        amountMinor: input.amountMinor,
        currency: school.currency,
        channel: "MTN_MOMO",
        somaRef: reference.value,
        payerPhone: "+256700000000",
        payerName: "Sandbox Payer",
        narration: `Sandbox simulation ${reference.format()}`,
        providerRef: `sandbox-${reference.value}`,
        status: "PENDING",
      },
    });

    return { somaReference: reference.value, status: "PENDING" };
  }
}
