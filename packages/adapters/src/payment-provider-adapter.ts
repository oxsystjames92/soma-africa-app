import type { Money } from "@soma/core";

/**
 * PaymentProviderAdapter — the single interface behind which every payment
 * rail lives (CLAUDE.md §2.1, §7 F3). Never special-case a provider elsewhere.
 *
 * The same interface serves partner/aggregator mode (settling through a
 * licensed third party) and direct mode (Soma's own licence): the mode is a
 * property of the adapter configuration, invisible to callers.
 */

export type AdapterMode = "partner" | "direct";

export interface InitiatePaymentInput {
  /** Soma's idempotent payment reference — safe to retry with the same value. */
  somaReference: string;
  amount: Money;
  /** Payer MSISDN in E.164. Never logged raw — redact to last 4 digits. */
  payerPhone: string;
  narration: string;
}

export type PaymentInitiationStatus = "accepted" | "rejected";
export type ProviderPaymentStatus = "pending" | "succeeded" | "failed" | "unknown";

export interface InitiatePaymentResult {
  status: PaymentInitiationStatus;
  /** Provider-side reference for status inquiry, when accepted. */
  providerRef?: string;
}

export interface ParsedWebhook {
  /** Provider event identifier used for inbound deduplication (CLAUDE.md §8.4). */
  eventId: string;
  somaReference: string;
  status: ProviderPaymentStatus;
  raw: Record<string, unknown>;
}

export interface PaymentProviderAdapter {
  readonly name: string;
  readonly mode: AdapterMode;

  /** Trigger a debit-prompt (STK/USSD push) on the payer's device. */
  initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;

  /** Poll the provider for the current status of a payment. */
  checkStatus(providerRef: string): Promise<ProviderPaymentStatus>;

  /**
   * Verify an inbound callback signature (HMAC-SHA256 or provider scheme).
   * MUST return false rather than throw on malformed input — callers treat
   * any non-true result as a rejected webhook.
   */
  verifyInboundSignature(payload: string, signature: string): boolean;

  /** Parse a verified inbound callback into the normalized event shape. */
  parseWebhook(payload: string): ParsedWebhook;
}
