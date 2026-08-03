import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  AdapterMode,
  InitiatePaymentInput,
  InitiatePaymentResult,
  ParsedWebhook,
  PaymentProviderAdapter,
  ProviderPaymentStatus,
} from "./payment-provider-adapter.js";
import type { HttpTransport } from "./transport.js";

export interface MtnMomoConfig {
  mode: AdapterMode;
  baseUrl: string;
  subscriptionKey: string;
  apiUser: string;
  apiKey: string;
  /** Shared secret for verifying inbound callbacks. */
  callbackSecret: string;
  /** MTN's target environment, e.g. "sandbox" or "mtnuganda". */
  targetEnvironment: string;
}

/** MTN's RequestToPay states, mapped onto Soma's vocabulary. */
const STATUS_MAP: Record<string, ProviderPaymentStatus> = {
  SUCCESSFUL: "succeeded",
  PENDING: "pending",
  FAILED: "failed",
  REJECTED: "failed",
  TIMEOUT: "failed",
};

/**
 * MTN Mobile Money collections (CLAUDE.md §7 F3).
 *
 * Partner/aggregator mode is what ships: Soma settles through a licensed
 * partner while its own PSP licence is pending (§2.1). Direct mode is
 * declared but refuses to run until a licence is actually held — a config
 * flag must never be the only thing standing between us and unlicensed
 * money movement.
 */
export class MtnMomoAdapter implements PaymentProviderAdapter {
  readonly name = "mtn_momo";

  constructor(
    private readonly config: MtnMomoConfig,
    private readonly transport: HttpTransport,
  ) {
    if (config.mode === "direct") {
      throw new Error(
        "MtnMomoAdapter direct mode is not licensed for use. Run in partner mode until Soma holds a PSP licence (CLAUDE.md §2.1).",
      );
    }
  }

  get mode(): AdapterMode {
    return this.config.mode;
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const res = await this.transport.send({
      method: "POST",
      url: `${this.config.baseUrl}/collection/v1_0/requesttopay`,
      headers: {
        // Credentials in headers only — never in the URL (CLAUDE.md §8.2).
        Authorization: `Bearer ${this.config.apiKey}`,
        "X-Reference-Id": input.somaReference,
        "X-Target-Environment": this.config.targetEnvironment,
        "Ocp-Apim-Subscription-Key": this.config.subscriptionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amount.minorUnits.toString(),
        currency: input.amount.currency,
        externalId: input.somaReference,
        payer: { partyIdType: "MSISDN", partyId: input.payerPhone.replace(/^\+/, "") },
        payerMessage: input.narration,
        payeeNote: input.narration,
      }),
    });

    // MTN answers 202 Accepted; the debit prompt then lands on the payer's phone.
    if (res.status === 202) {
      return { status: "accepted", providerRef: input.somaReference };
    }
    return { status: "rejected" };
  }

  async checkStatus(providerRef: string): Promise<ProviderPaymentStatus> {
    const res = await this.transport.send({
      method: "GET",
      url: `${this.config.baseUrl}/collection/v1_0/requesttopay/${encodeURIComponent(providerRef)}`,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "X-Target-Environment": this.config.targetEnvironment,
        "Ocp-Apim-Subscription-Key": this.config.subscriptionKey,
      },
    });
    if (res.status !== 200) return "unknown";
    const parsed = JSON.parse(res.body) as { status?: string };
    return STATUS_MAP[parsed.status ?? ""] ?? "unknown";
  }

  verifyInboundSignature(payload: string, signature: string): boolean {
    const expected = createHmac("sha256", this.config.callbackSecret).update(payload).digest();
    let received: Buffer;
    try {
      received = Buffer.from(signature, "hex");
    } catch {
      return false;
    }
    // Length check first: timingSafeEqual throws on a mismatch.
    if (received.length !== expected.length) return false;
    return timingSafeEqual(expected, received);
  }

  parseWebhook(payload: string): ParsedWebhook {
    const raw = JSON.parse(payload) as Record<string, unknown>;
    const reference = String(raw["externalId"] ?? raw["referenceId"] ?? "");
    return {
      // MTN reuses the reference we supplied as the event identity.
      eventId: `mtn:${reference}:${String(raw["status"] ?? "")}`,
      somaReference: reference,
      status: STATUS_MAP[String(raw["status"] ?? "")] ?? "unknown",
      raw,
    };
  }
}
