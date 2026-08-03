import { Money } from "./money.js";
import type { Currency } from "./money.js";

/**
 * Spreading one payment across a student's outstanding invoices.
 *
 * Pure integer arithmetic on minor units. A parent paying "something toward
 * the fees" is the normal case, not the exception, so partial payment is a
 * first-class outcome rather than an error.
 */

export interface OutstandingInvoice {
  invoiceId: string;
  /** Total billed on this invoice. */
  amountDueMinor: bigint;
  /** Already settled by earlier payments. */
  amountPaidMinor: bigint;
  dueDate: Date;
}

export interface Allocation {
  invoiceId: string;
  amountMinor: bigint;
  /** Whether this allocation closes the invoice. */
  settles: boolean;
}

export interface AllocationPlan {
  allocations: Allocation[];
  /** Money left after every invoice is settled — sits as a credit. */
  creditMinor: bigint;
  /** True when the payment could not close every invoice it touched. */
  partial: boolean;
}

export function outstandingOf(invoice: OutstandingInvoice): bigint {
  const remaining = invoice.amountDueMinor - invoice.amountPaidMinor;
  return remaining > 0n ? remaining : 0n;
}

/**
 * Allocate oldest-due first.
 *
 * This ordering is deliberate and matters to families: clearing the oldest
 * debt first is what stops a child accruing arrears penalties on a term they
 * have in fact partly paid for. Ties break on invoice id so the plan is
 * deterministic and reproducible in an audit.
 */
export function planAllocation(
  paymentMinor: bigint,
  invoices: readonly OutstandingInvoice[],
): AllocationPlan {
  if (paymentMinor <= 0n) {
    return { allocations: [], creditMinor: 0n, partial: false };
  }

  const open = invoices
    .filter((invoice) => outstandingOf(invoice) > 0n)
    .sort(
      (a, b) =>
        a.dueDate.getTime() - b.dueDate.getTime() || a.invoiceId.localeCompare(b.invoiceId),
    );

  const allocations: Allocation[] = [];
  let remaining = paymentMinor;
  let partial = false;

  for (const invoice of open) {
    if (remaining <= 0n) break;
    const owed = outstandingOf(invoice);
    const amount = remaining >= owed ? owed : remaining;

    allocations.push({ invoiceId: invoice.invoiceId, amountMinor: amount, settles: amount === owed });
    if (amount < owed) partial = true;
    remaining -= amount;
  }

  return { allocations, creditMinor: remaining, partial };
}

/** Convenience wrapper that keeps currency attached through the arithmetic. */
export function planAllocationInCurrency(
  payment: Money,
  invoices: readonly OutstandingInvoice[],
): AllocationPlan {
  return planAllocation(payment.minorUnits, invoices);
}

/** Arrears buckets, in days past the due date. */
export const AGING_BUCKETS = ["current", "1-30", "31-60", "61-90", "90+"] as const;
export type AgingBucket = (typeof AGING_BUCKETS)[number];

export function agingBucket(dueDate: Date, asOf: Date): AgingBucket {
  const days = Math.floor((asOf.getTime() - dueDate.getTime()) / 86_400_000);
  if (days <= 0) return "current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export interface AgingSummary {
  bucket: AgingBucket;
  amountMinor: bigint;
  invoiceCount: number;
}

/** Total outstanding money per aging bucket — the bursar's arrears view. */
export function summarizeAging(
  invoices: readonly OutstandingInvoice[],
  asOf: Date,
  currency: Currency,
): { buckets: AgingSummary[]; totalMinor: bigint; currency: Currency } {
  const totals = new Map<AgingBucket, { amountMinor: bigint; invoiceCount: number }>(
    AGING_BUCKETS.map((bucket) => [bucket, { amountMinor: 0n, invoiceCount: 0 }]),
  );

  let totalMinor = 0n;
  for (const invoice of invoices) {
    const owed = outstandingOf(invoice);
    if (owed === 0n) continue;
    const entry = totals.get(agingBucket(invoice.dueDate, asOf))!;
    entry.amountMinor += owed;
    entry.invoiceCount += 1;
    totalMinor += owed;
  }

  return {
    buckets: AGING_BUCKETS.map((bucket) => ({ bucket, ...totals.get(bucket)! })),
    totalMinor,
    currency,
  };
}
