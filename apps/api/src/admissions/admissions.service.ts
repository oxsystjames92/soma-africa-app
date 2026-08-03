import { randomBytes, randomInt } from "node:crypto";
import argon2 from "argon2";
import { AuthenticationError, DomainError } from "@soma/core";
import type { SomaPrismaClient } from "@soma/db";

export class ApplicationNotFoundError extends DomainError {
  readonly code = "APPLICATION_NOT_FOUND";
  constructor() {
    // Identical for "no such reference" and "wrong phone", so the endpoint
    // cannot be used to discover which references exist.
    super("No application matches that reference and phone number");
  }
}

export class ApplicationLockedError extends DomainError {
  readonly code = "APPLICATION_LOCKED";
  constructor() {
    super("Too many incorrect codes. Request a new one.");
  }
}

export class InvalidTransitionError extends DomainError {
  readonly code = "INVALID_TRANSITION";
  constructor(from: string, to: string) {
    super(`An application cannot go from ${from} to ${to}`);
  }
}

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

/** Crockford-style alphabet: no letters a reader can confuse over the phone. */
const REF_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Which status changes are legal. Anything absent is rejected. */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED", "WITHDRAWN"],
  UNDER_REVIEW: ["OFFERED", "REJECTED", "WITHDRAWN"],
  OFFERED: ["ACCEPTED", "REJECTED", "WITHDRAWN"],
  ACCEPTED: [],
  REJECTED: [],
  WITHDRAWN: [],
  DRAFT: ["SUBMITTED", "WITHDRAWN"],
};

export interface OtpSender {
  send(phone: string, code: string): Promise<void>;
}

/**
 * Online admissions (CLAUDE.md §7 F13).
 *
 * An applicant has no Soma account and may never have one, so the only
 * credential is the reference plus the phone that filed it. Every status
 * change is written to an append-only trail, because an admissions decision
 * is exactly the kind of thing a family later disputes.
 */
export class AdmissionsService {
  constructor(
    private readonly prisma: SomaPrismaClient,
    private readonly otp: OtpSender,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Unguessable enough that possession is meaningful: 40 bits of entropy. */
  private generateReference(): string {
    const bytes = randomBytes(8);
    let body = "";
    for (let i = 0; i < 8; i++) body += REF_ALPHABET[bytes[i]! % 32]!;
    return `APP-${body.slice(0, 4)}-${body.slice(4)}`;
  }

  async submit(input: {
    schoolId: string;
    applicantFirst: string;
    applicantLast: string;
    dateOfBirth?: Date | undefined;
    appliedFor: string;
    guardianName: string;
    guardianPhone: string;
    guardianEmail?: string | undefined;
  }): Promise<{ reference: string }> {
    const application = await this.prisma.application.create({
      data: {
        schoolId: input.schoolId,
        reference: this.generateReference(),
        applicantFirst: input.applicantFirst,
        applicantLast: input.applicantLast,
        dateOfBirth: input.dateOfBirth ?? null,
        appliedFor: input.appliedFor,
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        guardianEmail: input.guardianEmail ?? null,
        status: "SUBMITTED",
      },
    });

    await this.prisma.applicationEvent.create({
      data: {
        applicationId: application.id,
        fromStatus: null,
        toStatus: "SUBMITTED",
        note: "Application submitted",
      },
    });

    return { reference: application.reference };
  }

  /**
   * Send a code to the phone that filed the application.
   *
   * Always resolves. A wrong reference gets silence rather than an error, so
   * this cannot be walked to discover valid references.
   */
  async requestStatusCode(reference: string, phone: string): Promise<void> {
    const application = await this.prisma.application.findFirst({
      where: { reference, guardianPhone: phone },
      select: { id: true },
    });
    if (!application) return;

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await this.prisma.application.update({
      where: { id: application.id },
      data: {
        otpHash: await argon2.hash(code, { type: argon2.argon2id }),
        otpExpiresAt: new Date(this.now().getTime() + OTP_TTL_MS),
        otpAttempts: 0,
      },
    });
    await this.otp.send(phone, code);
  }

  /**
   * Exchange the code for the application's progress.
   *
   * Returns the applicant's own details, which is safe because the caller has
   * proven possession of both the reference and the phone.
   */
  async checkStatus(reference: string, phone: string, code: string) {
    const application = await this.prisma.application.findFirst({
      where: { reference, guardianPhone: phone },
    });
    if (!application) throw new ApplicationNotFoundError();
    if (!application.otpHash || !application.otpExpiresAt || application.otpExpiresAt < this.now()) {
      throw new AuthenticationError();
    }
    if (application.otpAttempts >= MAX_OTP_ATTEMPTS) throw new ApplicationLockedError();

    const valid = await argon2.verify(application.otpHash, code).catch(() => false);
    if (!valid) {
      await this.prisma.application.update({
        where: { id: application.id },
        data: { otpAttempts: { increment: 1 } },
      });
      throw new AuthenticationError();
    }

    await this.prisma.application.update({
      where: { id: application.id },
      data: { otpHash: null, otpExpiresAt: null, otpAttempts: 0 },
    });

    const events = await this.prisma.applicationEvent.findMany({
      where: { applicationId: application.id },
      orderBy: { createdAt: "asc" },
      select: { toStatus: true, note: true, createdAt: true },
    });

    return {
      reference: application.reference,
      applicantName: `${application.applicantFirst} ${application.applicantLast}`,
      appliedFor: application.appliedFor,
      status: application.status,
      submittedAt: application.submittedAt,
      decidedAt: application.decidedAt,
      history: events,
    };
  }

  /** The admissions officer's worklist. */
  list(schoolId: string, status?: string, limit = 50) {
    return this.prisma.application.findMany({
      where: { schoolId, ...(status ? { status: status as never } : {}) },
      orderBy: { submittedAt: "asc" },
      take: limit,
      select: {
        id: true,
        reference: true,
        applicantFirst: true,
        applicantLast: true,
        appliedFor: true,
        guardianName: true,
        guardianPhone: true,
        status: true,
        submittedAt: true,
      },
    });
  }

  /**
   * Move an application along. Illegal transitions are refused rather than
   * applied, so a rejected applicant cannot be quietly resurrected.
   */
  async transition(
    schoolId: string,
    applicationId: string,
    toStatus: "UNDER_REVIEW" | "OFFERED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN",
    actorId: string,
    note?: string,
  ) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, schoolId },
    });
    if (!application) throw new ApplicationNotFoundError();

    const allowed = ALLOWED_TRANSITIONS[application.status] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new InvalidTransitionError(application.status, toStatus);
    }

    return this.prisma.$transaction(async (tx) => {
      const isFinal = ["ACCEPTED", "REJECTED", "WITHDRAWN"].includes(toStatus);
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: toStatus,
          ...(isFinal ? { decidedAt: this.now(), decidedBy: actorId } : {}),
        },
      });

      await tx.applicationEvent.create({
        data: {
          applicationId,
          fromStatus: application.status,
          toStatus,
          actorId,
          note: note ?? null,
        },
      });

      return { reference: updated.reference, status: updated.status };
    });
  }

  /**
   * Turn an accepted application into a student.
   *
   * Separate from the transition so enrolling is an explicit act — an
   * acceptance that silently created a student would make the roster change
   * as a side effect of an admissions click.
   */
  async enrol(schoolId: string, applicationId: string, actorId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, schoolId, status: "ACCEPTED" },
    });
    if (!application) throw new ApplicationNotFoundError();
    if (application.studentId) {
      return { studentId: application.studentId, created: false };
    }

    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.create({
        data: {
          schoolId,
          firstName: application.applicantFirst,
          lastName: application.applicantLast,
          className: application.appliedFor,
        },
      });

      const guardian = await tx.guardian.create({
        data: {
          schoolId,
          name: application.guardianName,
          phone: application.guardianPhone,
          email: application.guardianEmail,
        },
      });
      await tx.guardianStudent.create({
        data: { guardianId: guardian.id, studentId: student.id, isPrimary: true },
      });

      await tx.application.update({
        where: { id: applicationId },
        data: { studentId: student.id },
      });
      await tx.applicationEvent.create({
        data: {
          applicationId,
          fromStatus: "ACCEPTED",
          toStatus: "ACCEPTED",
          actorId,
          note: "Enrolled as a student",
        },
      });

      return { studentId: student.id, created: true };
    });
  }
}
