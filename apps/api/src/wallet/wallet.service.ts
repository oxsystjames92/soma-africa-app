import { DomainError, Money, type Currency } from "@soma/core";
import type { SomaPrismaClient } from "@soma/db";

export class WalletNotFoundError extends DomainError {
  readonly code = "WALLET_NOT_FOUND";
  constructor() {
    super("Wallet not found");
  }
}

export class WalletFrozenError extends DomainError {
  readonly code = "WALLET_FROZEN";
  constructor() {
    super("This wallet is frozen and cannot move money");
  }
}

export class InsufficientFundsError extends DomainError {
  readonly code = "INSUFFICIENT_FUNDS";
  constructor() {
    // No balance in the message: an unauthorized caller probing for limits
    // would otherwise learn the balance from the error text.
    super("Not enough pocket money in this wallet");
  }
}

export class InvalidAmountError extends DomainError {
  readonly code = "INVALID_AMOUNT";
  constructor() {
    super("Amount must be greater than zero");
  }
}

export interface StatementLine {
  id: string;
  type: string;
  amountMinor: bigint;
  balanceAfterMinor: bigint;
  currency: string;
  reference: string | null;
  note: string | null;
  createdAt: Date;
}

/**
 * Student pocket-money wallets (CLAUDE.md §7 F14).
 *
 * Every movement writes two immutable rows: a `WalletEntry` for the statement
 * and a `LedgerEntry` for the school's books. Both are append-only, so a
 * wallet can be reconciled against the ledger and neither can be quietly
 * rewritten to make them agree.
 */
export class WalletService {
  constructor(
    private readonly prisma: SomaPrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async openFor(schoolId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true },
    });
    if (!student) throw new WalletNotFoundError();

    const school = await this.prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
      select: { currency: true },
    });

    return this.prisma.wallet.upsert({
      where: { studentId },
      update: {},
      create: { schoolId, studentId, currency: school.currency },
    });
  }

  async balance(schoolId: string, studentId: string) {
    const wallet = await this.prisma.wallet.findFirst({ where: { studentId, schoolId } });
    if (!wallet) throw new WalletNotFoundError();
    return {
      walletId: wallet.id,
      balanceMinor: wallet.balanceMinor,
      currency: wallet.currency as Currency,
      status: wallet.status,
    };
  }

  /**
   * Add money. Deposits normally originate from a settled payment, in which
   * case `paymentId` ties the wallet entry back to the rail transaction.
   */
  deposit(input: {
    schoolId: string;
    studentId: string;
    amountMinor: bigint;
    paymentId?: string;
    actorId?: string;
    reference?: string;
    note?: string;
  }) {
    return this.move({ ...input, type: "DEPOSIT", direction: 1n });
  }

  /** Student spends at the canteen or bookshop. */
  withdraw(input: {
    schoolId: string;
    studentId: string;
    amountMinor: bigint;
    actorId: string;
    reference?: string;
    note?: string;
  }) {
    return this.move({ ...input, type: "WITHDRAWAL", direction: -1n });
  }

  /** Bursar hands physical cash to the student and records it. */
  cashout(input: {
    schoolId: string;
    studentId: string;
    amountMinor: bigint;
    actorId: string;
    note?: string;
  }) {
    return this.move({ ...input, type: "CASHOUT", direction: -1n });
  }

  /** Statement, newest first. Each line carries the balance after it. */
  async statement(
    schoolId: string,
    studentId: string,
    limit = 50,
  ): Promise<StatementLine[]> {
    const wallet = await this.prisma.wallet.findFirst({ where: { studentId, schoolId } });
    if (!wallet) throw new WalletNotFoundError();

    return this.prisma.walletEntry.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        amountMinor: true,
        balanceAfterMinor: true,
        currency: true,
        reference: true,
        note: true,
        createdAt: true,
      },
    });
  }

  async setStatus(schoolId: string, studentId: string, status: "ACTIVE" | "FROZEN" | "CLOSED") {
    const updated = await this.prisma.wallet.updateMany({
      where: { studentId, schoolId },
      data: { status },
    });
    if (updated.count === 0) throw new WalletNotFoundError();
  }

  /**
   * The single path through which a wallet balance changes.
   *
   * Concurrency is the danger here. Two withdrawals racing could each read a
   * sufficient balance and both commit, overdrawing the child. The guard is
   * a conditional update that asserts the balance we read is still the
   * balance on the row: if another transaction moved first, zero rows match
   * and this attempt is rejected rather than applied to stale state.
   */
  private async move(input: {
    schoolId: string;
    studentId: string;
    amountMinor: bigint;
    type: "DEPOSIT" | "WITHDRAWAL" | "CASHOUT" | "ADJUSTMENT";
    direction: bigint;
    paymentId?: string;
    actorId?: string;
    reference?: string;
    note?: string;
  }) {
    if (input.amountMinor <= 0n) throw new InvalidAmountError();

    const wallet = await this.prisma.wallet.findFirst({
      where: { studentId: input.studentId, schoolId: input.schoolId },
    });
    if (!wallet) throw new WalletNotFoundError();
    if (wallet.status !== "ACTIVE") throw new WalletFrozenError();

    // Validate the amount through Money so a wallet cannot hold a value the
    // rest of the system would reject.
    const amount = Money.of(input.amountMinor, wallet.currency as Currency);
    const delta = amount.minorUnits * input.direction;
    const nextBalance = wallet.balanceMinor + delta;
    if (nextBalance < 0n) throw new InsufficientFundsError();

    return this.prisma.$transaction(async (tx) => {
      // Optimistic guard: the row must still hold the balance we read.
      const claimed = await tx.wallet.updateMany({
        where: { id: wallet.id, balanceMinor: wallet.balanceMinor, status: "ACTIVE" },
        data: { balanceMinor: nextBalance },
      });
      if (claimed.count === 0) throw new InsufficientFundsError();

      const entry = await tx.walletEntry.create({
        data: {
          walletId: wallet.id,
          schoolId: input.schoolId,
          type: input.type,
          // Stored unsigned; direction lives in `type`.
          amountMinor: amount.minorUnits,
          balanceAfterMinor: nextBalance,
          currency: wallet.currency,
          paymentId: input.paymentId ?? null,
          actorId: input.actorId ?? null,
          reference: input.reference ?? null,
          note: input.note ?? null,
        },
      });

      // The school's books record the same fact independently.
      await tx.ledgerEntry.create({
        data: {
          schoolId: input.schoolId,
          type: "ADJUSTMENT",
          amountMinor: delta,
          currency: wallet.currency,
          refs: {
            walletId: wallet.id,
            walletEntryId: entry.id,
            studentId: input.studentId,
            kind: `wallet_${input.type.toLowerCase()}`,
            ...(input.paymentId ? { paymentId: input.paymentId } : {}),
          },
        },
      });

      return {
        entryId: entry.id,
        balanceMinor: nextBalance,
        currency: wallet.currency as Currency,
      };
    });
  }
}
