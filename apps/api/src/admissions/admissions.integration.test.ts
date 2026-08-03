/**
 * Online admissions against a real database.
 *
 * An applicant has no account, so the reference plus the phone that filed it
 * is the whole credential. These tests check that possession is required, that
 * references cannot be discovered, and that a decision cannot be quietly
 * reversed.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthenticationError } from "@soma/core";
import { createPrismaClient } from "@soma/db";
import {
  AdmissionsService,
  ApplicationLockedError,
  ApplicationNotFoundError,
  InvalidTransitionError,
  type OtpSender,
} from "./admissions.service.js";

const hasDb = !!process.env.DATABASE_URL;
const d = describe.skipIf(!hasDb);

class CapturingSender implements OtpSender {
  lastCode = "";
  async send(_phone: string, code: string): Promise<void> {
    this.lastCode = code;
  }
}

const prisma = hasDb ? createPrismaClient() : null!;
const sender = new CapturingSender();
const admissions = new AdmissionsService(prisma, sender);

const SCHOOL = randomUUID();
const OTHER_SCHOOL = randomUUID();
const OFFICER = randomUUID();
const PHONE = "+256700555444";

async function apply(overrides: Partial<{ guardianPhone: string }> = {}) {
  return admissions.submit({
    schoolId: SCHOOL,
    applicantFirst: "Grace",
    applicantLast: "Namubiru",
    appliedFor: "P1",
    guardianName: "Sarah Namubiru",
    guardianPhone: overrides.guardianPhone ?? PHONE,
  });
}

async function idFor(reference: string): Promise<string> {
  return (await prisma.application.findFirstOrThrow({ where: { reference } })).id;
}

beforeAll(async () => {
  if (!hasDb) return;
  for (const id of [SCHOOL, OTHER_SCHOOL]) {
    await prisma.school.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: `Admissions Test ${id.slice(0, 6)}`,
        country: "UG",
        currency: "UGX",
        timezone: "Africa/Kampala",
      },
    });
  }
});

afterAll(async () => {
  if (!hasDb) return;
  // ApplicationEvent is append-only, so applications that moved stay behind.
  await prisma.$disconnect();
});

d("applying", () => {
  it("returns an unguessable tracking reference", async () => {
    const { reference } = await apply();
    expect(reference).toMatch(/^APP-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  });

  it("issues distinct references", async () => {
    const references = new Set<string>();
    for (let i = 0; i < 40; i++) references.add((await apply()).reference);
    expect(references.size).toBe(40);
  });

  it("records the submission in an append-only trail", async () => {
    const { reference } = await apply();
    const events = await prisma.applicationEvent.findMany({
      where: { applicationId: await idFor(reference) },
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ toStatus: "SUBMITTED", fromStatus: null });
  });
});

d("checking status requires both the reference and the phone", () => {
  it("returns progress to someone holding both plus the code", async () => {
    const { reference } = await apply();
    await admissions.requestStatusCode(reference, PHONE);

    const status = await admissions.checkStatus(reference, PHONE, sender.lastCode);
    expect(status).toMatchObject({
      reference,
      applicantName: "Grace Namubiru",
      appliedFor: "P1",
      status: "SUBMITTED",
    });
    expect(status.history).toHaveLength(1);
  });

  it("stays silent for a reference that does not exist", async () => {
    sender.lastCode = "";
    await expect(admissions.requestStatusCode("APP-ZZZZ-ZZZZ", PHONE)).resolves.toBeUndefined();
    // Nothing was sent, so nothing confirms or denies the reference.
    expect(sender.lastCode).toBe("");
  });

  it("stays silent when the phone does not match the reference", async () => {
    const { reference } = await apply();
    sender.lastCode = "";
    await admissions.requestStatusCode(reference, "+256700000999");
    expect(sender.lastCode).toBe("");
  });

  it("refuses the right code from the wrong phone", async () => {
    const { reference } = await apply();
    await admissions.requestStatusCode(reference, PHONE);
    await expect(
      admissions.checkStatus(reference, "+256700000999", sender.lastCode),
    ).rejects.toBeInstanceOf(ApplicationNotFoundError);
  });

  it("rejects a wrong code and consumes an attempt", async () => {
    const { reference } = await apply();
    await admissions.requestStatusCode(reference, PHONE);
    await expect(admissions.checkStatus(reference, PHONE, "000000")).rejects.toBeInstanceOf(
      AuthenticationError,
    );

    const application = await prisma.application.findFirstOrThrow({ where: { reference } });
    expect(application.otpAttempts).toBe(1);
  });

  it("locks after repeated wrong codes, even against the right one", async () => {
    const { reference } = await apply();
    await admissions.requestStatusCode(reference, PHONE);
    const correct = sender.lastCode;

    for (let i = 0; i < 5; i++) {
      await expect(admissions.checkStatus(reference, PHONE, "000000")).rejects.toThrow();
    }
    await expect(admissions.checkStatus(reference, PHONE, correct)).rejects.toBeInstanceOf(
      ApplicationLockedError,
    );
  });

  it("consumes the code on success", async () => {
    const { reference } = await apply();
    await admissions.requestStatusCode(reference, PHONE);
    const code = sender.lastCode;

    await admissions.checkStatus(reference, PHONE, code);
    await expect(admissions.checkStatus(reference, PHONE, code)).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });
});

d("decisions", () => {
  it("walks an application to an offer and records each step", async () => {
    const { reference } = await apply();
    const id = await idFor(reference);

    await admissions.transition(SCHOOL, id, "UNDER_REVIEW", OFFICER, "Documents received");
    await admissions.transition(SCHOOL, id, "OFFERED", OFFICER, "Place available in P1");
    const final = await admissions.transition(SCHOOL, id, "ACCEPTED", OFFICER);

    expect(final.status).toBe("ACCEPTED");

    const events = await prisma.applicationEvent.findMany({
      where: { applicationId: id },
      orderBy: { createdAt: "asc" },
    });
    expect(events.map((e) => e.toStatus)).toEqual([
      "SUBMITTED",
      "UNDER_REVIEW",
      "OFFERED",
      "ACCEPTED",
    ]);
    expect(events[1]!.actorId).toBe(OFFICER);
  });

  it("refuses an illegal jump", async () => {
    const { reference } = await apply();
    const id = await idFor(reference);
    // SUBMITTED cannot go straight to ACCEPTED without an offer.
    await expect(admissions.transition(SCHOOL, id, "ACCEPTED", OFFICER)).rejects.toBeInstanceOf(
      InvalidTransitionError,
    );
  });

  it("will not resurrect a rejected application", async () => {
    const { reference } = await apply();
    const id = await idFor(reference);
    await admissions.transition(SCHOOL, id, "REJECTED", OFFICER, "No places");

    for (const next of ["UNDER_REVIEW", "OFFERED", "ACCEPTED"] as const) {
      await expect(admissions.transition(SCHOOL, id, next, OFFICER)).rejects.toBeInstanceOf(
        InvalidTransitionError,
      );
    }
  });

  it("will not let another school decide", async () => {
    const { reference } = await apply();
    const id = await idFor(reference);
    await expect(
      admissions.transition(OTHER_SCHOOL, id, "UNDER_REVIEW", OFFICER),
    ).rejects.toBeInstanceOf(ApplicationNotFoundError);
  });

  it("stamps who decided and when", async () => {
    const { reference } = await apply();
    const id = await idFor(reference);
    await admissions.transition(SCHOOL, id, "REJECTED", OFFICER, "Out of catchment");

    const application = await prisma.application.findFirstOrThrow({ where: { id } });
    expect(application.decidedBy).toBe(OFFICER);
    expect(application.decidedAt).not.toBeNull();
  });

  it("refuses to rewrite the decision trail at the database", async () => {
    const { reference } = await apply();
    await admissions.transition(SCHOOL, await idFor(reference), "UNDER_REVIEW", OFFICER);

    await expect(
      prisma.$executeRawUnsafe(`UPDATE "ApplicationEvent" SET "toStatus" = 'REJECTED'`),
    ).rejects.toThrow(/append-only/);
  });
});

d("enrolment", () => {
  it("creates a student and links the guardian", async () => {
    const { reference } = await apply();
    const id = await idFor(reference);
    await admissions.transition(SCHOOL, id, "UNDER_REVIEW", OFFICER);
    await admissions.transition(SCHOOL, id, "OFFERED", OFFICER);
    await admissions.transition(SCHOOL, id, "ACCEPTED", OFFICER);

    const { studentId, created } = await admissions.enrol(SCHOOL, id, OFFICER);
    expect(created).toBe(true);

    const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });
    expect(student).toMatchObject({ firstName: "Grace", lastName: "Namubiru", className: "P1" });

    const link = await prisma.guardianStudent.findFirstOrThrow({
      where: { studentId },
      include: { guardian: true },
    });
    expect(link.guardian.phone).toBe(PHONE);
    expect(link.isPrimary).toBe(true);
  });

  it("will not enrol an application that was never accepted", async () => {
    const { reference } = await apply();
    await expect(
      admissions.enrol(SCHOOL, await idFor(reference), OFFICER),
    ).rejects.toBeInstanceOf(ApplicationNotFoundError);
  });

  it("is idempotent — a second enrol does not create a second student", async () => {
    const { reference } = await apply();
    const id = await idFor(reference);
    await admissions.transition(SCHOOL, id, "UNDER_REVIEW", OFFICER);
    await admissions.transition(SCHOOL, id, "OFFERED", OFFICER);
    await admissions.transition(SCHOOL, id, "ACCEPTED", OFFICER);

    const first = await admissions.enrol(SCHOOL, id, OFFICER);
    const second = await admissions.enrol(SCHOOL, id, OFFICER);

    expect(second.studentId).toBe(first.studentId);
    expect(second.created).toBe(false);
  });
});
