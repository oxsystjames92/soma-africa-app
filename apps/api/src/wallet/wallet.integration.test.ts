/**
 * Pocket-money wallets against a real database.
 *
 * This is a child's money. The failures that matter are overdrawing a wallet
 * and losing a movement, so the tests below attack the balance directly —
 * including racing concurrent withdrawals, which a naive read-then-write
 * would fail.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPrismaClient } from "@soma/db";
import {
  InsufficientFundsError,
  InvalidAmountError,
  WalletFrozenError,
  WalletNotFoundError,
  WalletService,
} from "./wallet.service.js";
import { FeatureDisabledError, FinancingSeam, SavingsSeam } from "./financing-seam.js";

const hasDb = !!process.env.DATABASE_URL;
const d = describe.skipIf(!hasDb);

const prisma = hasDb ? createPrismaClient() : null!;
const wallets = new WalletService(prisma);

const SCHOOL = randomUUID();
const OTHER_SCHOOL = randomUUID();
const OTHER_STUDENT = randomUUID();
const BURSAR = randomUUID();

/**
 * A fresh student, and therefore a fresh wallet, per test.
 *
 * Wallet entries are append-only, so a wallet that has ever moved money
 * cannot be deleted — the cascade would have to delete its entries, and the
 * database refuses. Isolation is by new fixtures, never by cleanup.
 */
let STUDENT = "";

beforeAll(async () => {
  if (!hasDb) return;
  for (const id of [SCHOOL, OTHER_SCHOOL]) {
    await prisma.school.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: `Wallet Test ${id.slice(0, 6)}`,
        country: "UG",
        currency: "UGX",
        timezone: "Africa/Kampala",
      },
    });
  }
  await prisma.student.create({
    data: { id: OTHER_STUDENT, schoolId: OTHER_SCHOOL, firstName: "Other", lastName: "Child" },
  });
});

beforeEach(async () => {
  if (!hasDb) return;
  STUDENT = randomUUID();
  await prisma.student.create({
    data: { id: STUDENT, schoolId: SCHOOL, firstName: "Amina", lastName: "Nakato" },
  });
  await wallets.openFor(SCHOOL, STUDENT);
});

afterAll(async () => {
  if (!hasDb) return;
  // Only the untouched fixture is removable; wallets that moved money stay.
  await prisma.student.deleteMany({ where: { id: OTHER_STUDENT } });
  await prisma.$disconnect();
});

d("deposits and withdrawals", () => {
  it("credits a deposit and reports the new balance", async () => {
    const result = await wallets.deposit({
      schoolId: SCHOOL,
      studentId: STUDENT,
      amountMinor: 50_000n,
      actorId: BURSAR,
    });
    expect(result.balanceMinor).toBe(50_000n);
    expect((await wallets.balance(SCHOOL, STUDENT)).balanceMinor).toBe(50_000n);
  });

  it("debits a withdrawal", async () => {
    await wallets.deposit({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 50_000n, actorId: BURSAR });
    const result = await wallets.withdraw({
      schoolId: SCHOOL,
      studentId: STUDENT,
      amountMinor: 20_000n,
      actorId: BURSAR,
    });
    expect(result.balanceMinor).toBe(30_000n);
  });

  it("records a bursar cashout", async () => {
    await wallets.deposit({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 30_000n, actorId: BURSAR });
    await wallets.cashout({
      schoolId: SCHOOL,
      studentId: STUDENT,
      amountMinor: 30_000n,
      actorId: BURSAR,
      note: "Handed to student at the office",
    });
    expect((await wallets.balance(SCHOOL, STUDENT)).balanceMinor).toBe(0n);

    const statement = await wallets.statement(SCHOOL, STUDENT);
    expect(statement[0]).toMatchObject({ type: "CASHOUT", balanceAfterMinor: 0n });
  });

  it("stores amounts unsigned, with direction carried by type", async () => {
    await wallets.deposit({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 10_000n, actorId: BURSAR });
    await wallets.withdraw({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 4_000n, actorId: BURSAR });

    const statement = await wallets.statement(SCHOOL, STUDENT);
    // A sign error cannot silently invert a withdrawal into a deposit.
    for (const line of statement) expect(line.amountMinor > 0n).toBe(true);
    expect(statement.map((l) => l.type)).toEqual(["WITHDRAWAL", "DEPOSIT"]);
  });
});

d("a wallet can never go negative", () => {
  it("refuses a withdrawal larger than the balance", async () => {
    await wallets.deposit({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 10_000n, actorId: BURSAR });
    await expect(
      wallets.withdraw({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 10_001n, actorId: BURSAR }),
    ).rejects.toBeInstanceOf(InsufficientFundsError);

    expect((await wallets.balance(SCHOOL, STUDENT)).balanceMinor).toBe(10_000n);
  });

  it("refuses to withdraw from an empty wallet", async () => {
    await expect(
      wallets.withdraw({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 1n, actorId: BURSAR }),
    ).rejects.toBeInstanceOf(InsufficientFundsError);
  });

  it("does not leak the balance in the error", async () => {
    await wallets.deposit({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 7_777n, actorId: BURSAR });
    const message = await wallets
      .withdraw({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 99_999n, actorId: BURSAR })
      .catch((e: Error) => e.message);
    expect(message).not.toContain("7777");
    expect(message).not.toContain("7,777");
  });

  it("rejects zero and negative amounts", async () => {
    for (const amount of [0n, -100n]) {
      await expect(
        wallets.deposit({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: amount, actorId: BURSAR }),
      ).rejects.toBeInstanceOf(InvalidAmountError);
    }
  });

  it("survives concurrent withdrawals without overdrawing", async () => {
    await wallets.deposit({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 10_000n, actorId: BURSAR });

    // Ten simultaneous attempts to take the whole balance. A read-then-write
    // implementation lets several through and leaves the child overdrawn.
    const attempts = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        wallets.withdraw({
          schoolId: SCHOOL,
          studentId: STUDENT,
          amountMinor: 10_000n,
          actorId: BURSAR,
        }),
      ),
    );

    const succeeded = attempts.filter((a) => a.status === "fulfilled");
    expect(succeeded).toHaveLength(1);

    const balance = await wallets.balance(SCHOOL, STUDENT);
    expect(balance.balanceMinor).toBe(0n);
    expect(balance.balanceMinor >= 0n).toBe(true);
  });

  it("keeps the balance equal to the sum of its entries", async () => {
    await wallets.deposit({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 40_000n, actorId: BURSAR });
    await wallets.withdraw({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 15_000n, actorId: BURSAR });
    await wallets.deposit({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 5_000n, actorId: BURSAR });
    await wallets.cashout({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 10_000n, actorId: BURSAR });

    const statement = await wallets.statement(SCHOOL, STUDENT);
    const replayed = statement.reduce(
      (sum, line) => (line.type === "DEPOSIT" ? sum + line.amountMinor : sum - line.amountMinor),
      0n,
    );

    const stored = (await wallets.balance(SCHOOL, STUDENT)).balanceMinor;
    expect(stored).toBe(replayed);
    expect(stored).toBe(20_000n);
  });
});

d("the ledger records every wallet movement", () => {
  it("writes a ledger entry per movement, signed by direction", async () => {
    const { entryId } = await wallets.deposit({
      schoolId: SCHOOL,
      studentId: STUDENT,
      amountMinor: 25_000n,
      actorId: BURSAR,
    });

    const entries = await prisma.ledgerEntry.findMany({
      where: { schoolId: SCHOOL, refs: { path: ["walletEntryId"], equals: entryId } },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]!.amountMinor).toBe(25_000n);

    const { entryId: outId } = await wallets.withdraw({
      schoolId: SCHOOL,
      studentId: STUDENT,
      amountMinor: 5_000n,
      actorId: BURSAR,
    });
    const outEntry = await prisma.ledgerEntry.findFirstOrThrow({
      where: { schoolId: SCHOOL, refs: { path: ["walletEntryId"], equals: outId } },
    });
    // Money leaving is negative in the school's books.
    expect(outEntry.amountMinor).toBe(-5_000n);
  });

  it("refuses to rewrite wallet history at the database", async () => {
    await wallets.deposit({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 1_000n, actorId: BURSAR });
    await expect(
      prisma.$executeRawUnsafe(`UPDATE "WalletEntry" SET "amountMinor" = 0`),
    ).rejects.toThrow(/append-only/);
    await expect(prisma.$executeRawUnsafe(`DELETE FROM "WalletEntry"`)).rejects.toThrow(
      /append-only/,
    );
  });
});

d("wallet status and isolation", () => {
  it("blocks movement on a frozen wallet", async () => {
    await wallets.deposit({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 10_000n, actorId: BURSAR });
    await wallets.setStatus(SCHOOL, STUDENT, "FROZEN");

    await expect(
      wallets.withdraw({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 1_000n, actorId: BURSAR }),
    ).rejects.toBeInstanceOf(WalletFrozenError);
    await expect(
      wallets.deposit({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 1_000n, actorId: BURSAR }),
    ).rejects.toBeInstanceOf(WalletFrozenError);
  });

  it("will not open or reach a wallet in another school", async () => {
    await expect(wallets.openFor(SCHOOL, OTHER_STUDENT)).rejects.toBeInstanceOf(WalletNotFoundError);
    await expect(wallets.balance(OTHER_SCHOOL, STUDENT)).rejects.toBeInstanceOf(WalletNotFoundError);
    await expect(
      wallets.withdraw({ schoolId: OTHER_SCHOOL, studentId: STUDENT, amountMinor: 1n, actorId: BURSAR }),
    ).rejects.toBeInstanceOf(WalletNotFoundError);
  });

  it("is idempotent when opening an existing wallet", async () => {
    const first = await wallets.openFor(SCHOOL, STUDENT);
    await wallets.deposit({ schoolId: SCHOOL, studentId: STUDENT, amountMinor: 3_000n, actorId: BURSAR });
    const second = await wallets.openFor(SCHOOL, STUDENT);

    expect(second.id).toBe(first.id);
    expect(second.balanceMinor).toBe(3_000n);
  });
});

describe("Phase-2 seams stay shut", () => {
  it("refuses financing while the flag is off", async () => {
    await expect(
      new FinancingSeam().createInstalmentPlan({
        schoolId: "s",
        studentId: "st",
        invoiceId: "i",
        totalMinor: 1000n,
        instalments: 3,
      }),
    ).rejects.toBeInstanceOf(FeatureDisabledError);
  });

  it("refuses savings while the flag is off", async () => {
    await expect(new SavingsSeam().openAccount("s", "st")).rejects.toBeInstanceOf(
      FeatureDisabledError,
    );
  });

  it("reports itself unavailable without a licensed partner", () => {
    expect(new FinancingSeam().available()).toBe(false);
    expect(new SavingsSeam().available()).toBe(false);
  });
});
