/**
 * Reminders (CLAUDE.md §7 F11).
 *
 * An opt-out is a promise to a person, and a rate limit is a promise not to
 * become a nuisance. These tests try to break both, and check that no message
 * body, phone number, or child name is ever written where it could leak.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPrismaClient } from "@soma/db";
import {
  maskDestination,
  type NotificationChannel,
  type OutboundMessage,
  type ReminderChannelName,
} from "./notification-channel.js";
import { RATE_LIMIT_COUNT, ReminderService } from "./reminder.service.js";

const hasDb = !!process.env.DATABASE_URL;
const d = describe.skipIf(!hasDb);

class RecordingChannel implements NotificationChannel {
  readonly sent: OutboundMessage[] = [];
  failNext = false;
  constructor(readonly channel: ReminderChannelName) {}
  async send(message: OutboundMessage): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("carrier rejected");
    }
    this.sent.push(message);
  }
}

const prisma = hasDb ? createPrismaClient() : null!;
const sms = new RecordingChannel("SMS");
const whatsapp = new RecordingChannel("WHATSAPP");
const email = new RecordingChannel("EMAIL");
const reminders = new ReminderService(
  prisma,
  new Map<ReminderChannelName, NotificationChannel>([
    ["SMS", sms],
    ["WHATSAPP", whatsapp],
    ["EMAIL", email],
  ]),
);

const SCHOOL = randomUUID();
const STUDENT = randomUUID();
const PHONE = `+2567${Math.floor(Math.random() * 90_000_000 + 10_000_000)}`;
let identityId = "";

function request(channel: ReminderChannelName = "SMS") {
  return {
    identityId,
    schoolId: SCHOOL,
    studentId: STUDENT,
    channel,
    kind: "fee_due",
    body: "Amina Nakato owes UGX 450,000 for Term 1.",
  };
}

beforeAll(async () => {
  if (!hasDb) return;
  await prisma.school.upsert({
    where: { id: SCHOOL },
    update: {},
    create: { id: SCHOOL, name: "Reminder Test", country: "UG", currency: "UGX", timezone: "Africa/Kampala" },
  });
  await prisma.student.upsert({
    where: { id: STUDENT },
    update: {},
    create: { id: STUDENT, schoolId: SCHOOL, firstName: "Amina", lastName: "Nakato" },
  });
  const identity = await prisma.guardianIdentity.create({ data: { phone: PHONE } });
  identityId = identity.id;
  await prisma.guardian.create({
    data: { schoolId: SCHOOL, identityId, name: "Grace Nakato", phone: PHONE, email: "grace@example.com" },
  });
});

beforeEach(async () => {
  if (!hasDb) return;
  sms.sent.length = 0;
  whatsapp.sent.length = 0;
  email.sent.length = 0;
  await prisma.reminderLog.deleteMany({ where: { identityId } });
  await prisma.reminderPreference.deleteMany({ where: { identityId } });
});

afterAll(async () => {
  if (!hasDb) return;
  await prisma.reminderLog.deleteMany({ where: { identityId } });
  await prisma.reminderPreference.deleteMany({ where: { identityId } });
  await prisma.guardian.deleteMany({ where: { identityId } });
  await prisma.guardianIdentity.deleteMany({ where: { id: identityId } });
  await prisma.student.deleteMany({ where: { id: STUDENT } });
  await prisma.$disconnect();
});

d("sending", () => {
  it("sends on a channel the parent has not opted out of", async () => {
    expect(await reminders.send(request("SMS"))).toBe("SENT");
    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0]!.to).toBe(PHONE);
  });

  it("does not send email until the parent opts in", async () => {
    // Schools rarely hold a verified address; messaging one is a disclosure risk.
    expect(await reminders.send(request("EMAIL"))).toBe("SUPPRESSED_OPT_OUT");
    expect(email.sent).toHaveLength(0);

    await reminders.setPreference(identityId, "EMAIL", true);
    expect(await reminders.send(request("EMAIL"))).toBe("SENT");
    expect(email.sent[0]!.to).toBe("grace@example.com");
  });

  it("records a carrier failure without pretending it sent", async () => {
    sms.failNext = true;
    expect(await reminders.send(request("SMS"))).toBe("FAILED");

    const log = await prisma.reminderLog.findFirstOrThrow({ where: { identityId } });
    expect(log.status).toBe("FAILED");
  });
});

d("opt-out is absolute", () => {
  it("stops a channel the moment it is switched off", async () => {
    await reminders.setPreference(identityId, "SMS", false);
    expect(await reminders.send(request("SMS"))).toBe("SUPPRESSED_OPT_OUT");
    expect(sms.sent).toHaveLength(0);
  });

  it("silences every channel with one switch", async () => {
    await reminders.optOutOfEverything(identityId);
    for (const channel of ["SMS", "WHATSAPP", "EMAIL"] as const) {
      expect(await reminders.send(request(channel))).toBe("SUPPRESSED_OPT_OUT");
    }
    expect([...sms.sent, ...whatsapp.sent, ...email.sent]).toHaveLength(0);
  });

  it("keeps an opt-out switched off across many attempts", async () => {
    await reminders.setPreference(identityId, "SMS", false);
    for (let i = 0; i < 10; i++) {
      expect(await reminders.send(request("SMS"))).toBe("SUPPRESSED_OPT_OUT");
    }
    expect(sms.sent).toHaveLength(0);
  });

  it("opts a parent back in when they ask", async () => {
    await reminders.setPreference(identityId, "SMS", false);
    await reminders.setPreference(identityId, "SMS", true);
    expect(await reminders.send(request("SMS"))).toBe("SENT");
  });

  it("reports preferences with defaults filled in", async () => {
    expect(await reminders.preferences(identityId)).toEqual({
      SMS: true,
      WHATSAPP: true,
      EMAIL: false,
    });
    await reminders.setPreference(identityId, "SMS", false);
    expect((await reminders.preferences(identityId)).SMS).toBe(false);
  });
});

d("rate limiting", () => {
  it("stops after the allowance and records why", async () => {
    for (let i = 0; i < RATE_LIMIT_COUNT; i++) {
      expect(await reminders.send(request("SMS"))).toBe("SENT");
    }
    expect(await reminders.send(request("SMS"))).toBe("SUPPRESSED_RATE_LIMIT");
    expect(sms.sent).toHaveLength(RATE_LIMIT_COUNT);
  });

  it("counts per parent, not per channel — being messaged is one experience", async () => {
    for (let i = 0; i < RATE_LIMIT_COUNT; i++) await reminders.send(request("SMS"));
    // Switching channel must not reset the allowance.
    expect(await reminders.send(request("WHATSAPP"))).toBe("SUPPRESSED_RATE_LIMIT");
  });

  it("does not let suppressions consume the allowance", async () => {
    await reminders.setPreference(identityId, "SMS", false);
    for (let i = 0; i < 10; i++) await reminders.send(request("SMS"));

    // Ten suppressed attempts must not have used up a real parent's quota.
    await reminders.setPreference(identityId, "SMS", true);
    expect(await reminders.send(request("SMS"))).toBe("SENT");
  });

  it("frees the allowance once the window passes", async () => {
    let now = new Date("2026-06-01T00:00:00Z");
    const clocked = new ReminderService(
      prisma,
      new Map<ReminderChannelName, NotificationChannel>([["SMS", sms]]),
      () => now,
    );
    for (let i = 0; i < RATE_LIMIT_COUNT; i++) await clocked.send(request("SMS"));
    expect(await clocked.send(request("SMS"))).toBe("SUPPRESSED_RATE_LIMIT");

    now = new Date("2026-06-15T00:00:00Z");
    expect(await clocked.send(request("SMS"))).toBe("SENT");
  });
});

d("no PII escapes", () => {
  it("never stores the message body, which names a child and their balance", async () => {
    await reminders.send(request("SMS"));
    await reminders.setPreference(identityId, "WHATSAPP", false);
    await reminders.send(request("WHATSAPP"));

    const logs = await prisma.reminderLog.findMany({ where: { identityId } });
    expect(logs.length).toBeGreaterThan(0);
    for (const log of logs) {
      const serialized = JSON.stringify(log);
      expect(serialized).not.toContain("Amina");
      expect(serialized).not.toContain("Nakato");
      expect(serialized).not.toContain("450,000");
      expect(serialized).not.toContain(PHONE);
    }
  });

  it("masks destinations for logging", () => {
    expect(maskDestination("+256700123456")).toBe("***3456");
    expect(maskDestination("grace@example.com")).toBe("g***@example.com");
    // The full value never survives masking.
    expect(maskDestination("+256700123456")).not.toContain("256700");
  });

  it("records suppressions so an opt-out can be proven", async () => {
    await reminders.setPreference(identityId, "SMS", false);
    await reminders.send(request("SMS"));

    const log = await prisma.reminderLog.findFirstOrThrow({ where: { identityId } });
    expect(log.status).toBe("SUPPRESSED_OPT_OUT");
    expect(log.detail).toBe("Parent opted out of this channel");
  });
});
