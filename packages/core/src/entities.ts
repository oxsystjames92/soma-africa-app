import type { Currency } from "./money.js";

/** Core entity types — the ubiquitous language of CLAUDE.md §3. */

export type SchoolStatus = "active" | "suspended" | "churned";
export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "void";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "reversed";
export type PaymentChannel = "mtn_momo" | "airtel_money" | "bank" | "cash" | "other";
export type ProviderType = "schoolpay_import" | "mtn_momo" | "airtel_money" | "bank" | "soma_rail";
export type ReconciliationMethod = "auto" | "manual";
export type WebhookDirection = "inbound" | "outbound";
export type WebhookStatus = "pending" | "delivered" | "failed" | "dead";
export type LedgerEntryType =
  | "payment_received"
  | "payment_reversed"
  | "invoice_issued"
  | "invoice_voided"
  | "adjustment"
  | "settlement";

export interface School {
  id: string;
  schoolGroupId?: string | null;
  name: string;
  country: string;
  currency: Currency;
  timezone: string;
  status: SchoolStatus;
}

export interface SchoolGroup {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  schoolId: string;
  externalRef?: string | null;
  firstName: string;
  lastName: string;
  className?: string | null;
  status: "enrolled" | "left" | "graduated";
}

export interface Guardian {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  locale: string;
}

export interface Invoice {
  id: string;
  schoolId: string;
  studentId: string;
  term: string;
  amountDueMinor: bigint;
  currency: Currency;
  dueDate: Date;
  status: InvoiceStatus;
}

export interface Payment {
  id: string;
  schoolId: string;
  studentId?: string | null;
  amountMinor: bigint;
  currency: Currency;
  channel: PaymentChannel;
  providerRef: string;
  receiptNo?: string | null;
  paidAt: Date;
  status: PaymentStatus;
}

export interface ReconciliationMatch {
  id: string;
  paymentId: string;
  invoiceId: string;
  method: ReconciliationMethod;
  confidence: number; // 0..1
}

export interface PaymentProvider {
  id: string;
  type: ProviderType;
  config: Record<string, unknown>;
}

export interface WebhookEvent {
  id: string;
  direction: WebhookDirection;
  type: string;
  payload: Record<string, unknown>;
  signature?: string | null;
  attempts: number;
  status: WebhookStatus;
}

export interface LedgerEntry {
  id: string;
  schoolId: string;
  type: LedgerEntryType;
  amountMinor: bigint;
  currency: Currency;
  refs: Record<string, string>;
  createdAt: Date;
}
