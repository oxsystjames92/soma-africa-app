import type { Currency } from "@soma/core";

/**
 * Money leaving the rail and landing in the school's bank account (F6).
 * Settlement is a different shape from collection — it is pull-based and
 * batch-oriented — so it gets its own interface rather than being forced
 * through PaymentProviderAdapter.
 */

export interface SettlementBatch {
  /** Provider's batch identifier — the dedupe key for imports. */
  batchRef: string;
  amountMinor: bigint;
  currency: Currency;
  settledAt: Date;
  /** Soma references the provider claims are covered by this batch. */
  somaReferences: string[];
}

export interface BankSettlementAdapter {
  readonly name: string;
  /** Fetch settlement batches finalized within the window. */
  fetchSettlements(since: Date, until: Date): Promise<SettlementBatch[]>;
}

/** Test/sandbox settlement source. Returns whatever it was seeded with. */
export class InMemorySettlementAdapter implements BankSettlementAdapter {
  readonly name = "in_memory_bank";

  constructor(private readonly batches: SettlementBatch[] = []) {}

  async fetchSettlements(since: Date, until: Date): Promise<SettlementBatch[]> {
    return this.batches.filter((b) => b.settledAt >= since && b.settledAt <= until);
  }
}
