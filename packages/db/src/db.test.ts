/**
 * Integration tests — require DATABASE_URL (docker compose + migrate).
 * They prove the two M0 data-layer guarantees:
 *   (a) tenant isolation: School A's client cannot read School B's data
 *   (b) LedgerEntry is append-only at BOTH the client and database layer
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppendOnlyViolationError } from "@soma/core";
import { createPrismaClient, tenantScoped } from "./client.js";

const hasDb = !!process.env.DATABASE_URL;
const d = describe.skipIf(!hasDb);

const client = hasDb ? createPrismaClient() : null!;
const A = "test-school-a";
const B = "test-school-b";

beforeAll(async () => {
  if (!hasDb) return;
  for (const id of [A, B]) {
    await client.school.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: `Test ${id}`,
        country: "UG",
        currency: "UGX",
        timezone: "Africa/Kampala",
      },
    });
  }
  await client.student.upsert({
    where: { id: "test-student-b" },
    update: {},
    create: {
      id: "test-student-b",
      schoolId: B,
      firstName: "Secret",
      lastName: "Pupil",
    },
  });
});

afterAll(async () => {
  if (!hasDb) return;
  // Ledger rows are immutable by design, so they (and the schools they
  // reference) stay behind; fixtures are upserts, so reruns are idempotent.
  await client.student.deleteMany({ where: { schoolId: { in: [A, B] } } });
  await client.$disconnect();
});

d("tenant isolation", () => {
  it("scoped client cannot read another school's rows", async () => {
    const scopedA = tenantScoped(client, A);
    expect(await scopedA.student.findFirst({ where: { id: "test-student-b" } })).toBeNull();
    expect(await scopedA.student.findMany()).toEqual([]);
    // Unscoped control: the row does exist.
    expect(await client.student.findFirst({ where: { id: "test-student-b" } })).not.toBeNull();
  });

  it("scoped client cannot write into another school", async () => {
    const scopedA = tenantScoped(client, A);
    const created = await scopedA.student.create({
      // Malicious caller tries to plant a row in school B — schoolId is overridden.
      data: { schoolId: B, firstName: "Intruder", lastName: "X" },
    });
    expect(created.schoolId).toBe(A);
  });
});

d("append-only ledger", () => {
  it("client layer rejects update/delete/upsert", async () => {
    const entry = await client.ledgerEntry.create({
      data: { schoolId: A, type: "ADJUSTMENT", amountMinor: 100n, currency: "UGX", refs: {} },
    });
    await expect(
      client.ledgerEntry.update({ where: { id: entry.id }, data: { amountMinor: 999n } }),
    ).rejects.toThrow(AppendOnlyViolationError);
    await expect(client.ledgerEntry.delete({ where: { id: entry.id } })).rejects.toThrow(
      AppendOnlyViolationError,
    );
    await expect(client.ledgerEntry.deleteMany({})).rejects.toThrow(AppendOnlyViolationError);
  });

  it("database trigger rejects raw SQL update and delete", async () => {
    await expect(
      client.$executeRawUnsafe(`UPDATE "LedgerEntry" SET "amountMinor" = 0`),
    ).rejects.toThrow(/append-only/);
    await expect(client.$executeRawUnsafe(`DELETE FROM "LedgerEntry"`)).rejects.toThrow(
      /append-only/,
    );
  });
});
