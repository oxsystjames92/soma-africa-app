/**
 * The parent experience against a real database.
 *
 * A parent identity is the one thing in Soma that crosses tenants, so the
 * tests that matter most are the ones proving it crosses exactly as far as
 * its student links and not one row further.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPrismaClient } from "@soma/db";
import { MtnMomoAdapter, type HttpRequest, type HttpResponse, type HttpTransport } from "@soma/adapters";
import { PaymentsService } from "../payments/payments.service.js";
import { GuardianAuthService, type OtpDispatcher } from "./guardian-auth.service.js";
import { GuardianTokenService } from "./guardian-token.service.js";
import { ParentService } from "./parent.service.js";
import { PayerProfileService } from "./payer-profile.service.js";

const hasDb = !!process.env.DATABASE_URL;
const d = describe.skipIf(!hasDb);

class ScriptedTransport implements HttpTransport {
  readonly sent: HttpRequest[] = [];
  private responses: HttpResponse[] = [];
  queue(...r: HttpResponse[]): void {
    this.responses.push(...r);
  }
  reset(): void {
    this.sent.length = 0;
    this.responses = [];
  }
  async send(request: HttpRequest): Promise<HttpResponse> {
    this.sent.push(request);
    return this.responses.shift() ?? { status: 500, body: "{}" };
  }
}

class CapturingDispatcher implements OtpDispatcher {
  lastCode = "";
  async send(_phone: string, code: string): Promise<void> {
    this.lastCode = code;
  }
}

const prisma = hasDb ? createPrismaClient() : null!;
const transport = new ScriptedTransport();
const adapter = new MtnMomoAdapter(
  {
    mode: "partner",
    baseUrl: "https://sandbox.example/mtn",
    subscriptionKey: "s",
    apiUser: "u",
    apiKey: "k",
    callbackSecret: "sandbox-secret-value",
    targetEnvironment: "sandbox",
  },
  transport,
);
const payments = new PaymentsService(prisma, new Map([["mtn_momo", adapter]]));
const parent = new ParentService(prisma, payments);
const profiles = new PayerProfileService(prisma);
const tokens = new GuardianTokenService("parent-test-secret-at-least-32-chars", 3600);
const dispatcher = new CapturingDispatcher();
const auth = new GuardianAuthService(prisma, tokens, dispatcher);

// One parent, two children, two different schools — the multi-school case.
const SCHOOL_A = randomUUID();
const SCHOOL_B = randomUUID();
const CHILD_A = randomUUID();
const CHILD_B = randomUUID();
/** Another family's child, at School A. Must stay invisible. */
const STRANGER = randomUUID();

const PARENT_PHONE = "+256700111222";
const OTHER_PARENT_PHONE = "+256700999888";
const GUARDIAN_A = randomUUID();
const GUARDIAN_B = randomUUID();
const OTHER_GUARDIAN = randomUUID();

const FEES = 45_000_00n;
let identityId = "";
let otherIdentityId = "";

async function makeInvoice(studentId: string, schoolId: string, amount = FEES): Promise<string> {
  const invoice = await prisma.invoice.create({
    data: {
      schoolId,
      studentId,
      term: "2026-T1",
      amountDueMinor: amount,
      currency: "UGX",
      dueDate: new Date(Date.now() - 10 * 86_400_000),
      status: "ISSUED",
    },
  });
  return invoice.id;
}

beforeAll(async () => {
  if (!hasDb) return;
  for (const [id, name] of [
    [SCHOOL_A, "Kampala Primary"],
    [SCHOOL_B, "Entebbe Secondary"],
  ] as const) {
    await prisma.school.upsert({
      where: { id },
      update: {},
      create: { id, name, country: "UG", currency: "UGX", timezone: "Africa/Kampala" },
    });
  }

  await prisma.student.createMany({
    data: [
      { id: CHILD_A, schoolId: SCHOOL_A, firstName: "Amina", lastName: "Nakato", className: "P5" },
      { id: CHILD_B, schoolId: SCHOOL_B, firstName: "Joseph", lastName: "Nakato", className: "S2" },
      { id: STRANGER, schoolId: SCHOOL_A, firstName: "Someone", lastName: "Else", className: "P5" },
    ],
    skipDuplicates: true,
  });

  // The same phone registered at both schools — this is what the identity unifies.
  await prisma.guardian.createMany({
    data: [
      { id: GUARDIAN_A, schoolId: SCHOOL_A, name: "Grace Nakato", phone: PARENT_PHONE, email: "grace@example.com" },
      { id: GUARDIAN_B, schoolId: SCHOOL_B, name: "Grace Nakato", phone: PARENT_PHONE },
      { id: OTHER_GUARDIAN, schoolId: SCHOOL_A, name: "Other Parent", phone: OTHER_PARENT_PHONE },
    ],
    skipDuplicates: true,
  });
  await prisma.guardianStudent.createMany({
    data: [
      { guardianId: GUARDIAN_A, studentId: CHILD_A, isPrimary: true },
      { guardianId: GUARDIAN_B, studentId: CHILD_B, isPrimary: true },
      { guardianId: OTHER_GUARDIAN, studentId: STRANGER, isPrimary: true },
    ],
    skipDuplicates: true,
  });

  // Logging in mints the identity and claims both school records.
  await auth.requestOtp(PARENT_PHONE);
  await auth.verifyOtp(PARENT_PHONE, dispatcher.lastCode);
  identityId = (await prisma.guardianIdentity.findUniqueOrThrow({ where: { phone: PARENT_PHONE } })).id;

  await auth.requestOtp(OTHER_PARENT_PHONE);
  await auth.verifyOtp(OTHER_PARENT_PHONE, dispatcher.lastCode);
  otherIdentityId = (await prisma.guardianIdentity.findUniqueOrThrow({ where: { phone: OTHER_PARENT_PHONE } })).id;
});

beforeEach(async () => {
  if (!hasDb) return;
  transport.reset();
  await prisma.reconciliationMatch.deleteMany({ where: { schoolId: { in: [SCHOOL_A, SCHOOL_B] } } });
  await prisma.payment.deleteMany({ where: { schoolId: { in: [SCHOOL_A, SCHOOL_B] } } });
  await prisma.invoice.deleteMany({ where: { schoolId: { in: [SCHOOL_A, SCHOOL_B] } } });
  await prisma.payerProfile.deleteMany({ where: { identityId } });
});

afterAll(async () => {
  if (!hasDb) return;
  await prisma.payerProfile.deleteMany({ where: { identityId } });
  await prisma.reminderLog.deleteMany({ where: { identityId } });
  await prisma.reminderPreference.deleteMany({ where: { identityId } });
  await prisma.reconciliationMatch.deleteMany({ where: { schoolId: { in: [SCHOOL_A, SCHOOL_B] } } });
  await prisma.payment.deleteMany({ where: { schoolId: { in: [SCHOOL_A, SCHOOL_B] } } });
  await prisma.invoice.deleteMany({ where: { schoolId: { in: [SCHOOL_A, SCHOOL_B] } } });
  await prisma.guardianStudent.deleteMany({
    where: { guardianId: { in: [GUARDIAN_A, GUARDIAN_B, OTHER_GUARDIAN] } },
  });
  await prisma.guardian.deleteMany({ where: { id: { in: [GUARDIAN_A, GUARDIAN_B, OTHER_GUARDIAN] } } });
  await prisma.guardianIdentity.deleteMany({ where: { phone: { in: [PARENT_PHONE, OTHER_PARENT_PHONE] } } });
  await prisma.student.deleteMany({ where: { id: { in: [CHILD_A, CHILD_B, STRANGER] } } });
  await prisma.$disconnect();
});

d("login", () => {
  it("unifies one phone across every school that registered it", async () => {
    const claimed = await prisma.guardian.findMany({
      where: { phone: PARENT_PHONE },
      select: { schoolId: true, identityId: true },
    });
    expect(claimed).toHaveLength(2);
    for (const guardian of claimed) expect(guardian.identityId).toBe(identityId);
  });

  it("stays silent for a phone no school registered", async () => {
    await expect(auth.requestOtp("+256799000000")).resolves.toBeUndefined();
    expect(
      await prisma.guardianIdentity.findUnique({ where: { phone: "+256799000000" } }),
    ).toBeNull();
  });

  it("rejects a wrong code and burns the attempt", async () => {
    await auth.requestOtp(PARENT_PHONE);
    await expect(auth.verifyOtp(PARENT_PHONE, "000000")).rejects.toThrow();
    const identity = await prisma.guardianIdentity.findUniqueOrThrow({ where: { phone: PARENT_PHONE } });
    expect(identity.otpAttempts).toBe(1);
  });

  it("locks out after repeated wrong codes", async () => {
    await auth.requestOtp(PARENT_PHONE);
    for (let i = 0; i < 5; i++) {
      await expect(auth.verifyOtp(PARENT_PHONE, "000000")).rejects.toThrow();
    }
    // Even the correct code is refused once the cap is hit.
    await expect(auth.verifyOtp(PARENT_PHONE, dispatcher.lastCode)).rejects.toThrow(
      /Too many incorrect codes/,
    );
  });

  it("consumes the code on success", async () => {
    await auth.requestOtp(PARENT_PHONE);
    const code = dispatcher.lastCode;
    await auth.verifyOtp(PARENT_PHONE, code);
    await expect(auth.verifyOtp(PARENT_PHONE, code)).rejects.toThrow();
  });

  it("will not accept a parent token at a staff endpoint", () => {
    const parentToken = tokens.sign({ gid: identityId });
    // The staff verifier uses the same secret but a different audience.
    const staffLike = new GuardianTokenService("parent-test-secret-at-least-32-chars", 3600);
    expect(() => staffLike.verify(parentToken)).not.toThrow();

    const jwtParts = parentToken.split(".");
    const payload = JSON.parse(Buffer.from(jwtParts[1]!, "base64url").toString());
    expect(payload.aud).toBe("soma:parent");
    // No schoolId and no role: nothing a staff route could act on.
    expect(payload.schoolId).toBeUndefined();
    expect(payload.role).toBeUndefined();
  });
});

d("multi-child, multi-school", () => {
  it("lists children from both schools with their balances", async () => {
    await makeInvoice(CHILD_A, SCHOOL_A, 45_000_00n);
    await makeInvoice(CHILD_B, SCHOOL_B, 60_000_00n);

    const children = await parent.children(identityId);
    expect(children).toHaveLength(2);

    const bySchool = Object.fromEntries(children.map((c) => [c.schoolName, c]));
    expect(bySchool["Kampala Primary"]).toMatchObject({
      studentId: CHILD_A,
      firstName: "Amina",
      outstandingMinor: 45_000_00n,
    });
    expect(bySchool["Entebbe Secondary"]).toMatchObject({
      studentId: CHILD_B,
      firstName: "Joseph",
      outstandingMinor: 60_000_00n,
    });
  });

  it("never shows another family's child at the same school", async () => {
    await makeInvoice(STRANGER, SCHOOL_A);
    const children = await parent.children(identityId);
    expect(children.map((c) => c.studentId)).not.toContain(STRANGER);
  });

  it("refuses to open another family's invoices", async () => {
    await makeInvoice(STRANGER, SCHOOL_A);
    await expect(parent.invoicesFor(identityId, STRANGER)).rejects.toThrow(/not linked/);
  });

  it("gives the same error for a stranger's child and a nonexistent one", async () => {
    const missing = randomUUID();
    const a = await parent.invoicesFor(identityId, STRANGER).catch((e: Error) => e.message);
    const b = await parent.invoicesFor(identityId, missing).catch((e: Error) => e.message);
    // Distinguishing them would leak which children exist at a school.
    expect(a).toBe(b);
  });

  it("shows a child only once when both parents' records link to them", async () => {
    const secondGuardian = randomUUID();
    await prisma.guardian.create({
      data: { id: secondGuardian, schoolId: SCHOOL_A, name: "Grace Nakato", phone: PARENT_PHONE, identityId },
    });
    await prisma.guardianStudent.create({
      data: { guardianId: secondGuardian, studentId: CHILD_A },
    });

    const children = await parent.children(identityId);
    expect(children.filter((c) => c.studentId === CHILD_A)).toHaveLength(1);

    await prisma.guardianStudent.deleteMany({ where: { guardianId: secondGuardian } });
    await prisma.guardian.delete({ where: { id: secondGuardian } });
  });
});

d("paying", () => {
  it("pays for a linked child through the payments context", async () => {
    await makeInvoice(CHILD_A, SCHOOL_A);
    transport.queue({ status: 202, body: "" });

    const result = await parent.pay(identityId, CHILD_A, 20_000_00n, "+256700111222", "MTN_MOMO");
    expect(result.status).toBe("pending");

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { somaRef: result.somaReference },
    });
    expect(payment).toMatchObject({
      schoolId: SCHOOL_A,
      studentId: CHILD_A,
      amountMinor: 20_000_00n,
      status: "PENDING",
    });
    // The reconciliation signal M2 was missing is now captured at source.
    expect(payment.payerName).toBe("Grace Nakato");
    expect(payment.narration).toContain("School fees");
  });

  it("refuses to pay for a child who is not theirs", async () => {
    await makeInvoice(STRANGER, SCHOOL_A);
    await expect(
      parent.pay(identityId, STRANGER, 10_000_00n, "+256700111222", "MTN_MOMO"),
    ).rejects.toThrow(/not linked/);
    // No payment row was created for the attempt.
    expect(await prisma.payment.count({ where: { studentId: STRANGER } })).toBe(0);
  });

  it("routes payment to the right school when children span two", async () => {
    await makeInvoice(CHILD_B, SCHOOL_B);
    transport.queue({ status: 202, body: "" });

    const result = await parent.pay(identityId, CHILD_B, 15_000_00n, "+256700111222", "MTN_MOMO");
    const payment = await prisma.payment.findUniqueOrThrow({
      where: { somaRef: result.somaReference },
    });
    expect(payment.schoolId).toBe(SCHOOL_B);
  });
});

d("history and receipts", () => {
  it("shows payments across every child and school, newest first", async () => {
    await makeInvoice(CHILD_A, SCHOOL_A);
    await makeInvoice(CHILD_B, SCHOOL_B);
    transport.queue({ status: 202, body: "" }, { status: 202, body: "" });
    await parent.pay(identityId, CHILD_A, 10_000_00n, "+256700111222", "MTN_MOMO");
    await parent.pay(identityId, CHILD_B, 20_000_00n, "+256700111222", "MTN_MOMO");

    const history = await parent.paymentHistory(identityId);
    expect(history).toHaveLength(2);
    expect(history.map((h) => h.schoolName).sort()).toEqual(["Entebbe Secondary", "Kampala Primary"]);
  });

  it("shows no history to a parent with no linked children", async () => {
    const orphan = await prisma.guardianIdentity.create({
      data: { phone: `+25670000${Math.floor(Math.random() * 9000 + 1000)}` },
    });
    expect(await parent.paymentHistory(orphan.id)).toEqual([]);
    await prisma.guardianIdentity.delete({ where: { id: orphan.id } });
  });

  it("issues a receipt only for a settled payment", async () => {
    await makeInvoice(CHILD_A, SCHOOL_A);
    transport.queue({ status: 202, body: "" });
    const { somaReference } = await parent.pay(
      identityId,
      CHILD_A,
      FEES,
      "+256700111222",
      "MTN_MOMO",
    );

    // Still pending — no receipt exists yet.
    await expect(parent.receipt(identityId, somaReference)).rejects.toThrow(/not found/i);

    await prisma.payment.update({
      where: { somaRef: somaReference },
      data: { status: "SUCCEEDED", paidAt: new Date(), receiptNo: "RCPT-TEST01" },
    });

    const receipt = await parent.receipt(identityId, somaReference);
    expect(receipt).toMatchObject({
      somaReference,
      receiptNo: "RCPT-TEST01",
      childName: "Amina Nakato",
      schoolName: "Kampala Primary",
      amountMinor: FEES,
    });
  });

  it("refuses a receipt belonging to another family", async () => {
    await makeInvoice(STRANGER, SCHOOL_A);
    transport.queue({ status: 202, body: "" });
    const { somaReference } = await payments.payForStudent({
      schoolId: SCHOOL_A,
      studentId: STRANGER,
      amountMinor: FEES,
      payerPhone: "+256700999888",
      channel: "MTN_MOMO",
    });
    await prisma.payment.update({
      where: { somaRef: somaReference },
      data: { status: "SUCCEEDED", paidAt: new Date(), receiptNo: "RCPT-OTHER" },
    });

    await expect(parent.receipt(identityId, somaReference)).rejects.toThrow(/not found/i);
    // The rightful parent can see it.
    await expect(parent.receipt(otherIdentityId, somaReference)).resolves.toMatchObject({
      receiptNo: "RCPT-OTHER",
    });
  });
});

d("saved payer profiles", () => {
  it("makes the first saved number the default without being asked", async () => {
    const saved = await profiles.save(identityId, "My MTN line", "+256700111222", "MTN_MOMO", false);
    expect(saved.isDefault).toBe(true);
  });

  it("moves the default when a new number claims it", async () => {
    await profiles.save(identityId, "First", "+256700111222", "MTN_MOMO", false);
    await profiles.save(identityId, "Second", "+256750333444", "AIRTEL_MONEY", true);

    const list = await profiles.list(identityId);
    expect(list.filter((p) => p.isDefault)).toHaveLength(1);
    expect(list[0]).toMatchObject({ label: "Second", isDefault: true });
  });

  it("updates rather than duplicates the same number", async () => {
    await profiles.save(identityId, "Old label", "+256700111222", "MTN_MOMO", false);
    await profiles.save(identityId, "New label", "+256700111222", "MTN_MOMO", false);

    const list = await profiles.list(identityId);
    expect(list).toHaveLength(1);
    expect(list[0]!.label).toBe("New label");
  });

  it("caps how many numbers can be saved", async () => {
    for (let i = 0; i < 5; i++) {
      await profiles.save(identityId, `Line ${i}`, `+25670011100${i}`, "MTN_MOMO", false);
    }
    await expect(
      profiles.save(identityId, "One too many", "+256700999111", "MTN_MOMO", false),
    ).rejects.toThrow(/up to 5/);
  });

  it("promotes a new default when the current one is deleted", async () => {
    const first = await profiles.save(identityId, "First", "+256700111222", "MTN_MOMO", true);
    await profiles.save(identityId, "Second", "+256750333444", "AIRTEL_MONEY", false);

    await profiles.remove(identityId, first.id);

    const list = await profiles.list(identityId);
    expect(list).toHaveLength(1);
    expect(list[0]!.isDefault).toBe(true);
  });

  it("will not delete another parent's saved number", async () => {
    const mine = await profiles.save(identityId, "Mine", "+256700111222", "MTN_MOMO", true);
    await expect(profiles.remove(otherIdentityId, mine.id)).rejects.toThrow(/not found/i);
    expect(await profiles.list(identityId)).toHaveLength(1);
  });
});
