import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  ParsedWebhook,
  PaymentProviderAdapter,
  ProviderPaymentStatus,
} from "./payment-provider-adapter.js";

/**
 * NoopAdapter — test/sandbox stand-in. Accepts everything, verifies nothing
 * as valid, and never touches a real rail. Real adapters land in M1.
 */
export class NoopAdapter implements PaymentProviderAdapter {
  readonly name = "noop";
  readonly mode = "partner" as const;

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    return { status: "accepted", providerRef: `noop-${input.somaReference}` };
  }

  async checkStatus(_providerRef: string): Promise<ProviderPaymentStatus> {
    return "pending";
  }

  verifyInboundSignature(_payload: string, _signature: string): boolean {
    // Fail closed: the noop rail can never produce a valid signature.
    return false;
  }

  parseWebhook(payload: string): ParsedWebhook {
    const raw = JSON.parse(payload) as Record<string, unknown>;
    return {
      eventId: String(raw["eventId"] ?? "noop-event"),
      somaReference: String(raw["somaReference"] ?? ""),
      status: "unknown",
      raw,
    };
  }
}
