import { describe, expect, it } from "vitest";
import {
  agingBucket,
  outstandingOf,
  planAllocation,
  summarizeAging,
  type OutstandingInvoice,
} from "./allocation.js";

const day = 86_400_000;
const AS_OF = new Date("2026-06-03T00:00:00Z");

function invoice(
  id: string,
  due: bigint,
  paid: bigint,
  dueDaysAgo: number,
): OutstandingInvoice {
  return {
    invoiceId: id,
    amountDueMinor: due,
    amountPaidMinor: paid,
    dueDate: new Date(AS_OF.getTime() - dueDaysAgo * day),
  };
}

describe("outstandingOf", () => {
  it("never reports a negative balance on an overpaid invoice", () => {
    expect(outstandingOf(invoice("i", 1000n, 1500n, 0))).toBe(0n);
  });
});

describe("planAllocation", () => {
  it("settles a single invoice exactly", () => {
    const plan = planAllocation(45_000_00n, [invoice("i1", 45_000_00n, 0n, 10)]);
    expect(plan.allocations).toEqual([
      { invoiceId: "i1", amountMinor: 45_000_00n, settles: true },
    ]);
    expect(plan.creditMinor).toBe(0n);
    expect(plan.partial).toBe(false);
  });

  it("applies a partial payment and flags it — the normal case, not an error", () => {
    const plan = planAllocation(20_000_00n, [invoice("i1", 45_000_00n, 0n, 10)]);
    expect(plan.allocations).toEqual([
      { invoiceId: "i1", amountMinor: 20_000_00n, settles: false },
    ]);
    expect(plan.partial).toBe(true);
    expect(plan.creditMinor).toBe(0n);
  });

  it("clears the oldest debt first so arrears do not compound", () => {
    const plan = planAllocation(50_000_00n, [
      invoice("recent", 30_000_00n, 0n, 5),
      invoice("oldest", 30_000_00n, 0n, 200),
      invoice("middle", 30_000_00n, 0n, 60),
    ]);
    expect(plan.allocations.map((a) => a.invoiceId)).toEqual(["oldest", "middle"]);
    expect(plan.allocations[0]).toMatchObject({ amountMinor: 30_000_00n, settles: true });
    expect(plan.allocations[1]).toMatchObject({ amountMinor: 20_000_00n, settles: false });
  });

  it("leaves an overpayment as credit rather than inventing an invoice", () => {
    const plan = planAllocation(60_000_00n, [invoice("i1", 45_000_00n, 0n, 10)]);
    expect(plan.allocations).toHaveLength(1);
    expect(plan.creditMinor).toBe(15_000_00n);
    expect(plan.partial).toBe(false);
  });

  it("accounts for money already paid on an invoice", () => {
    const plan = planAllocation(10_000_00n, [invoice("i1", 45_000_00n, 40_000_00n, 10)]);
    expect(plan.allocations).toEqual([
      { invoiceId: "i1", amountMinor: 5_000_00n, settles: true },
    ]);
    expect(plan.creditMinor).toBe(5_000_00n);
  });

  it("skips invoices that are already settled", () => {
    const plan = planAllocation(10_000_00n, [
      invoice("closed", 20_000_00n, 20_000_00n, 100),
      invoice("open", 20_000_00n, 0n, 10),
    ]);
    expect(plan.allocations.map((a) => a.invoiceId)).toEqual(["open"]);
  });

  it("returns an empty plan for a zero or negative payment", () => {
    for (const amount of [0n, -100n]) {
      expect(planAllocation(amount, [invoice("i1", 1000n, 0n, 1)])).toEqual({
        allocations: [],
        creditMinor: 0n,
        partial: false,
      });
    }
  });

  it("returns the whole payment as credit when nothing is owed", () => {
    const plan = planAllocation(10_000n, []);
    expect(plan.allocations).toEqual([]);
    expect(plan.creditMinor).toBe(10_000n);
  });

  it("never allocates more than the payment", () => {
    const invoices = [
      invoice("a", 10_000n, 0n, 30),
      invoice("b", 10_000n, 0n, 20),
      invoice("c", 10_000n, 0n, 10),
    ];
    const plan = planAllocation(15_000n, invoices);
    const total = plan.allocations.reduce((sum, a) => sum + a.amountMinor, 0n);
    expect(total + plan.creditMinor).toBe(15_000n);
    expect(total).toBeLessThanOrEqual(15_000n);
  });

  it("is deterministic when due dates tie", () => {
    const tied = [invoice("b-id", 5_000n, 0n, 30), invoice("a-id", 5_000n, 0n, 30)];
    const forward = planAllocation(5_000n, tied);
    const backward = planAllocation(5_000n, [...tied].reverse());
    expect(forward).toEqual(backward);
    expect(forward.allocations[0]!.invoiceId).toBe("a-id");
  });

  it("handles amounts far beyond Number.MAX_SAFE_INTEGER", () => {
    const huge = 9_007_199_254_740_993n * 1000n;
    const plan = planAllocation(huge, [invoice("i1", huge, 0n, 1)]);
    expect(plan.allocations[0]!.amountMinor).toBe(huge);
    expect(plan.creditMinor).toBe(0n);
  });
});

describe("agingBucket", () => {
  it("buckets by days past the due date", () => {
    expect(agingBucket(new Date(AS_OF.getTime() + 5 * day), AS_OF)).toBe("current");
    expect(agingBucket(AS_OF, AS_OF)).toBe("current");
    expect(agingBucket(new Date(AS_OF.getTime() - 1 * day), AS_OF)).toBe("1-30");
    expect(agingBucket(new Date(AS_OF.getTime() - 30 * day), AS_OF)).toBe("1-30");
    expect(agingBucket(new Date(AS_OF.getTime() - 31 * day), AS_OF)).toBe("31-60");
    expect(agingBucket(new Date(AS_OF.getTime() - 61 * day), AS_OF)).toBe("61-90");
    expect(agingBucket(new Date(AS_OF.getTime() - 91 * day), AS_OF)).toBe("90+");
  });
});

describe("summarizeAging", () => {
  it("totals outstanding money per bucket and ignores settled invoices", () => {
    const summary = summarizeAging(
      [
        invoice("current", 10_000n, 0n, -5),
        invoice("recent", 20_000n, 5_000n, 10),
        invoice("old", 30_000n, 0n, 120),
        invoice("settled", 99_000n, 99_000n, 200),
      ],
      AS_OF,
      "UGX",
    );

    const byBucket = Object.fromEntries(summary.buckets.map((b) => [b.bucket, b]));
    expect(byBucket["current"]).toMatchObject({ amountMinor: 10_000n, invoiceCount: 1 });
    expect(byBucket["1-30"]).toMatchObject({ amountMinor: 15_000n, invoiceCount: 1 });
    expect(byBucket["90+"]).toMatchObject({ amountMinor: 30_000n, invoiceCount: 1 });
    expect(byBucket["31-60"]).toMatchObject({ amountMinor: 0n, invoiceCount: 0 });
    expect(summary.totalMinor).toBe(55_000n);
    expect(summary.currency).toBe("UGX");
  });

  it("always returns every bucket, even when empty", () => {
    const summary = summarizeAging([], AS_OF, "UGX");
    expect(summary.buckets.map((b) => b.bucket)).toEqual([
      "current",
      "1-30",
      "31-60",
      "61-90",
      "90+",
    ]);
    expect(summary.totalMinor).toBe(0n);
  });
});
