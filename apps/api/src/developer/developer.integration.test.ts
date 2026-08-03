/**
 * The developer platform against a real database.
 *
 * The property that matters most here is the second isolation axis: a test
 * key must never reach live data. Because a sandbox is a TEST-mode school,
 * that reduces to tenant isolation — and these tests check it holds.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPrismaClient } from "@soma/db";
import { ApiKeyInvalidError, ApiKeyService, InsufficientScopeError } from "./api-key.service.js";
import { IdempotencyService } from "./idempotency.service.js";
import { PublicApiService } from "./public-api.service.js";
import { LiveKeyInSandboxError, SandboxService } from "./sandbox.service.js";
import { serialize } from "./serialize.js";

const hasDb = !!process.env.DATABASE_URL;
const d = describe.skipIf(!hasDb);

const prisma = hasDb ? createPrismaClient() : null!;
const keys = new ApiKeyService(prisma);
const api = new PublicApiService(prisma);
const sandbox = new SandboxService(prisma);
const idempotency = new IdempotencyService(prisma);

const LIVE_SCHOOL = randomUUID();
const OTHER_SCHOOL = randomUUID();
const OWNER = randomUUID();
let sandboxSchoolId = "";
let liveKey = "";
let testKey = "";

beforeAll(async () => {
  if (!hasDb) return;
  for (const [id, name] of [
    [LIVE_SCHOOL, "Dev Platform Live"],
    [OTHER_SCHOOL, "Someone Else"],
  ] as const) {
    await prisma.school.upsert({
      where: { id },
      update: {},
      create: { id, name, country: "UG", currency: "UGX", timezone: "Africa/Kampala", mode: "LIVE" },
    });
  }

  // Live data that a test key must never see.
  await prisma.student.create({
    data: {
      schoolId: LIVE_SCHOOL,
      firstName: "Real",
      lastName: "Student",
      externalRef: "9000000001",
      className: "P7",
    },
  });

  const provisioned = await sandbox.provision(LIVE_SCHOOL);
  sandboxSchoolId = provisioned.schoolId;

  liveKey = (await keys.issue(LIVE_SCHOOL, "live key", ["students:read", "payments:read"], OWNER)).key;
  testKey = (
    await keys.issue(
      sandboxSchoolId,
      "test key",
      ["students:read", "payments:read", "payments:write", "webhooks:read", "webhooks:write"],
      OWNER,
    )
  ).key;
});

beforeEach(async () => {
  if (!hasDb) return;
  await prisma.idempotencyRecord.deleteMany({
    where: { schoolId: { in: [LIVE_SCHOOL, sandboxSchoolId] } },
  });
});

afterAll(async () => {
  if (!hasDb) return;
  const schools = [LIVE_SCHOOL, OTHER_SCHOOL, sandboxSchoolId].filter(Boolean);
  await prisma.idempotencyRecord.deleteMany({ where: { schoolId: { in: schools } } });
  await prisma.apiKey.deleteMany({ where: { schoolId: { in: schools } } });
  await prisma.webhookDelivery.deleteMany({ where: { schoolId: { in: schools } } });
  await prisma.webhookEndpoint.deleteMany({ where: { schoolId: { in: schools } } });
  await prisma.payment.deleteMany({ where: { schoolId: { in: schools } } });
  await prisma.invoice.deleteMany({ where: { schoolId: { in: schools } } });
  await prisma.enrolment.deleteMany({ where: { schoolId: { in: schools } } });
  await prisma.student.deleteMany({ where: { schoolId: { in: schools } } });
  await prisma.schoolClass.deleteMany({ where: { schoolId: { in: schools } } });
  await prisma.term.deleteMany({ where: { schoolId: { in: schools } } });
  await prisma.school.deleteMany({ where: { id: { in: schools } } });
  await prisma.$disconnect();
});

d("API keys", () => {
  it("returns the secret once and never stores it", async () => {
    const issued = await keys.issue(LIVE_SCHOOL, "rotating", ["students:read"], OWNER);
    expect(issued.key).toMatch(/^sk_live_[0-9a-f]{8}_/);

    const stored = await prisma.apiKey.findUniqueOrThrow({ where: { id: issued.id } });
    expect(stored.hash).not.toBe(issued.key);
    expect(JSON.stringify(stored)).not.toContain(issued.key.split("_").at(-1)!);

    // Nothing the school can read afterwards exposes the secret.
    const listed = await keys.list(LIVE_SCHOOL);
    expect(JSON.stringify(listed)).not.toContain(issued.key);
  });

  it("marks sandbox keys sk_test_ and live keys sk_live_", async () => {
    expect(liveKey.startsWith("sk_live_")).toBe(true);
    expect(testKey.startsWith("sk_test_")).toBe(true);
  });

  it("authenticates a real key and resolves its tenant", async () => {
    const authed = await keys.authenticate(liveKey);
    expect(authed).toMatchObject({ schoolId: LIVE_SCHOOL, mode: "LIVE" });
  });

  it("rejects unknown, malformed, and tampered keys identically", async () => {
    for (const candidate of [
      "",
      "not-a-key",
      "sk_live_deadbeef_wrong",
      `${liveKey}x`,
      liveKey.slice(0, -1),
    ]) {
      await expect(keys.authenticate(candidate)).rejects.toBeInstanceOf(ApiKeyInvalidError);
    }
  });

  it("stops working the moment it is revoked", async () => {
    const issued = await keys.issue(LIVE_SCHOOL, "doomed", ["students:read"], OWNER);
    await expect(keys.authenticate(issued.key)).resolves.toBeTruthy();

    await keys.revoke(LIVE_SCHOOL, issued.id);
    await expect(keys.authenticate(issued.key)).rejects.toBeInstanceOf(ApiKeyInvalidError);
  });

  it("will not let one school revoke another's key", async () => {
    const issued = await keys.issue(LIVE_SCHOOL, "mine", ["students:read"], OWNER);
    await keys.revoke(OTHER_SCHOOL, issued.id);
    await expect(keys.authenticate(issued.key)).resolves.toBeTruthy();
  });

  it("enforces scopes", async () => {
    const authed = await keys.authenticate(liveKey);
    expect(() => keys.assertScope(authed, "students:read")).not.toThrow();
    expect(() => keys.assertScope(authed, "students:write")).toThrow(InsufficientScopeError);
  });

  it("records when a key was last used", async () => {
    const issued = await keys.issue(LIVE_SCHOOL, "tracked", ["students:read"], OWNER);
    await keys.authenticate(issued.key);
    await new Promise((r) => setTimeout(r, 50));

    const stored = await prisma.apiKey.findUniqueOrThrow({ where: { id: issued.id } });
    expect(stored.lastUsedAt).not.toBeNull();
  });
});

d("sandbox isolation — a test key must never touch live data", () => {
  it("gives a test key its own tenant", async () => {
    const authed = await keys.authenticate(testKey);
    expect(authed.mode).toBe("TEST");
    expect(authed.schoolId).toBe(sandboxSchoolId);
    expect(authed.schoolId).not.toBe(LIVE_SCHOOL);
  });

  it("shows a test key none of the live students", async () => {
    const authed = await keys.authenticate(testKey);
    const page = await api.listStudents(authed.schoolId, 100);

    expect(page.data.length).toBeGreaterThan(0);
    expect(page.data.map((s) => s.externalRef)).not.toContain("9000000001");
    expect(page.data.map((s) => s.lastName)).not.toContain("Student");
  });

  it("shows a live key none of the sandbox students", async () => {
    const authed = await keys.authenticate(liveKey);
    const page = await api.listStudents(authed.schoolId, 100);
    expect(page.data.map((s) => s.externalRef)).not.toContain("1000000001");
  });

  it("refuses to fetch a live student by id with a test key", async () => {
    const live = await prisma.student.findFirstOrThrow({ where: { schoolId: LIVE_SCHOOL } });
    const authed = await keys.authenticate(testKey);
    await expect(api.getStudent(authed.schoolId, live.id)).rejects.toThrow(/not found/i);
  });

  it("refuses simulation with a live key — live money is never simulated", async () => {
    const authed = await keys.authenticate(liveKey);
    await expect(
      sandbox.simulatePayment(authed.schoolId, authed.mode, {
        amountMinor: 1000n,
        outcome: "succeeded",
      }),
    ).rejects.toBeInstanceOf(LiveKeyInSandboxError);
  });

  it("will not provision a second sandbox", async () => {
    await expect(sandbox.provision(LIVE_SCHOOL)).rejects.toThrow(/already has a sandbox/);
  });
});

d("the sandbox is useful on arrival", () => {
  it("ships with students, enrolments, and open invoices", async () => {
    const students = await api.listStudents(sandboxSchoolId, 100);
    const invoices = await api.listInvoices(sandboxSchoolId, 100);

    expect(students.data.length).toBe(4);
    expect(invoices.data.length).toBe(4);
    // Something is actually owed, so a first call returns interesting data.
    expect(invoices.data.every((i) => i.amountDueMinor > 0n)).toBe(true);
  });

  it("includes two students sharing a name, so matching can be exercised", async () => {
    const students = await api.listStudents(sandboxSchoolId, 100);
    const mukasas = students.data.filter((s) => s.lastName === "Mukasa");
    expect(mukasas).toHaveLength(2);
    expect(mukasas[0]!.externalRef).not.toBe(mukasas[1]!.externalRef);
  });

  it("simulates a payment a developer can then observe", async () => {
    const authed = await keys.authenticate(testKey);
    const result = await sandbox.simulatePayment(authed.schoolId, authed.mode, {
      amountMinor: 45_000_00n,
      outcome: "succeeded",
    });

    expect(result.somaReference).toMatch(/^SOMA/);
    const payment = await api.getPayment(sandboxSchoolId, result.somaReference);
    expect(payment.amountMinor).toBe(45_000_00n);
  });
});

d("pagination", () => {
  it("walks pages with a stable cursor and stops cleanly", async () => {
    const first = await api.listStudents(sandboxSchoolId, 2);
    expect(first.data).toHaveLength(2);
    expect(first.hasMore).toBe(true);
    expect(first.nextCursor).toBe(first.data[1]!.id);

    const second = await api.listStudents(sandboxSchoolId, 2, first.nextCursor!);
    expect(second.data).toHaveLength(2);
    expect(second.hasMore).toBe(false);
    expect(second.nextCursor).toBeNull();

    // No row appears twice across the walk.
    const ids = [...first.data, ...second.data].map((s) => s.id);
    expect(new Set(ids).size).toBe(4);
  });
});

d("idempotency", () => {
  it("replays the original response for a repeated key", async () => {
    const body = { amountMinor: "100000" };
    expect(await idempotency.lookup(sandboxSchoolId, "k1", "POST /x", body)).toBeNull();

    await idempotency.remember(sandboxSchoolId, "k1", "POST /x", body, 201, { id: "first" });

    const replayed = await idempotency.lookup(sandboxSchoolId, "k1", "POST /x", body);
    expect(replayed).toEqual({ status: 201, body: { id: "first" } });
  });

  it("rejects a key reused with a different body", async () => {
    await idempotency.remember(sandboxSchoolId, "k2", "POST /x", { a: 1 }, 201, { id: "x" });
    await expect(
      idempotency.lookup(sandboxSchoolId, "k2", "POST /x", { a: 2 }),
    ).rejects.toThrow(/different request body/);
  });

  it("scopes keys per school, so tenants cannot collide", async () => {
    await idempotency.remember(sandboxSchoolId, "shared", "POST /x", { a: 1 }, 201, { id: "s" });
    expect(await idempotency.lookup(LIVE_SCHOOL, "shared", "POST /x", { a: 1 })).toBeNull();
  });
});

d("webhook management", () => {
  it("returns the signing secret once, then never again", async () => {
    const created = await api.createEndpoint(sandboxSchoolId, "https://example.com/hooks");
    expect(created.secret).toMatch(/^whsec_/);

    const listed = await api.listEndpoints(sandboxSchoolId);
    expect(JSON.stringify(listed)).not.toContain(created.secret);

    await api.deleteEndpoint(sandboxSchoolId, created.id);
  });

  it("will not delete another school's endpoint", async () => {
    const created = await api.createEndpoint(sandboxSchoolId, "https://example.com/hooks");
    await expect(api.deleteEndpoint(LIVE_SCHOOL, created.id)).rejects.toThrow(/not found/i);
    await api.deleteEndpoint(sandboxSchoolId, created.id);
  });

  it("exposes attempts and the last error for diagnosis", async () => {
    const endpoint = await api.createEndpoint(sandboxSchoolId, "https://example.com/hooks");
    await prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        schoolId: sandboxSchoolId,
        eventType: "payment.succeeded",
        payload: { hello: "world" },
        idempotencyKey: randomUUID(),
        attempts: 3,
        status: "PENDING",
        lastError: "HTTP 500",
      },
    });

    const page = await api.listDeliveries(sandboxSchoolId, 10);
    expect(page.data[0]).toMatchObject({ attempts: 3, lastError: "HTTP 500" });
    expect(page.data[0]!.idempotencyKey).toBeTruthy();
  });
});

describe("serialization", () => {
  it("renders bigint money as a string, never a lossy number", () => {
    const output = serialize({ amountMinor: 9_007_199_254_740_993n }) as { amountMinor: string };
    expect(output.amountMinor).toBe("9007199254740993");
    expect(typeof output.amountMinor).toBe("string");
  });

  it("renders dates as ISO strings and recurses through structures", () => {
    const output = serialize({
      when: new Date("2026-06-03T10:00:00.000Z"),
      nested: [{ amount: 5n }],
    }) as { when: string; nested: { amount: string }[] };

    expect(output.when).toBe("2026-06-03T10:00:00.000Z");
    expect(output.nested[0]!.amount).toBe("5");
  });

  it("survives JSON.stringify, which throws on raw bigint", () => {
    expect(() => JSON.stringify({ a: 1n })).toThrow();
    expect(() => JSON.stringify(serialize({ a: 1n }))).not.toThrow();
  });
});
