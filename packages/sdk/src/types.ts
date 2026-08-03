/**
 * Types for the Soma API.
 *
 * Every money field is a **decimal string of minor units** — `"4500000"` is
 * UGX 45,000.00. Parse with `BigInt`, never `parseFloat`: a JSON number cannot
 * hold these exactly and a rounded fee is the bug this API exists to avoid.
 */

export type SchoolMode = "LIVE" | "TEST";

export type Scope =
  | "students:read"
  | "students:write"
  | "invoices:read"
  | "invoices:write"
  | "payments:read"
  | "payments:write"
  | "webhooks:read"
  | "webhooks:write";

export interface Page<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface Student {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  className: string | null;
  /** The payment code printed on fee statements. */
  externalRef: string | null;
  regNumber: string | null;
  status: "ENROLLED" | "LEFT" | "GRADUATED";
}

export interface Invoice {
  id: string;
  studentId: string;
  term: string;
  /** Minor units, as a string. */
  amountDueMinor: string;
  amountPaidMinor: string;
  currency: string;
  dueDate: string;
  status: "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "VOID";
}

export interface Payment {
  id: string;
  somaRef: string;
  studentId: string | null;
  amountMinor: string;
  currency: string;
  channel: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "REVERSED";
  receiptNo: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  enabled: boolean;
  createdAt: string;
}

/** Returned only when an endpoint is created. The secret is never re-readable. */
export interface WebhookEndpointWithSecret extends WebhookEndpoint {
  secret: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventType: string;
  status: "PENDING" | "DELIVERED" | "FAILED" | "DEAD";
  attempts: number;
  lastError: string | null;
  nextAttemptAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  /** Stable across retries — dedupe on this. */
  idempotencyKey: string;
}

export interface ListOptions {
  limit?: number;
  cursor?: string;
}
