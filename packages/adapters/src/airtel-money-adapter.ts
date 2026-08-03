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

export interface AirtelMoneyConfig {
  mode: AdapterMode;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  callbackSecret: string;
  /** ISO-3166 alpha-2, e.g. "UG". */
  country: string;
  currency: string;
}

/** Airtel transaction states, mapped onto Soma's vocabulary. */
const STATUS_MAP: Record<string, ProviderPaymentStatus> = {
  TS: "succeeded",
  TF: "failed",
  TA: "pending",
  TIP: "pending",
};

/**
 * Airtel Money collections (CLAUDE.md §7 F3).
 *
 * Same licensing posture as MTN: partner/aggregator mode ships, direct mode
 * refuses to construct until Soma holds its own licence (§2.1).
 */
export class AirtelMoneyAdapter implements PaymentProviderAdapter {
  readonly name = "airtel_money";

  constructor(
    private readonly config: AirtelMoneyConfig,
    private readonly transport: HttpTransport,
  ) {
    if (config.mode === "direct") {
      throw new Error(
        "AirtelMoneyAdapter direct mode is not licensed for use. Run in partner mode until Soma holds a PSP licence (CLAUDE.md §2.1).",
      );
    }
  }

  get mode(): AdapterMode {
    return this.config.mode;
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const res = await this.transport.send({
      method: "POST",
      url: `${this.config.baseUrl}/merchant/v1/payments/`,
      headers: {
        Authorization: `Bearer ${this.config.clientSecret}`,
        "X-Country": this.config.country,
        "X-Currency": this.config.currency,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reference: input.narration,
        subscriber: {
          country: this.config.country,
          currency: this.config.currency,
          msisdn: input.payerPhone.replace(/^\+/, ""),
        },
        transaction: {
          amount: input.amount.minorUnits.toString(),
          country: this.config.country,
          currency: input.amount.currency,
          id: input.somaReference,
        },
      }),
    });

    if (res.status !== 200) return { status: "rejected" };
    const parsed = JSON.parse(res.body) as {
      status?: { success?: boolean };
      data?: { transaction?: { id?: string } };
    };
    if (parsed.status?.success !== true) return { status: "rejected" };

    return {
      status: "accepted",
      providerRef: parsed.data?.transaction?.id ?? input.somaReference,
    };
  }

  async checkStatus(providerRef: string): Promise<ProviderPaymentStatus> {
    const res = await this.transport.send({
      method: "GET",
      url: `${this.config.baseUrl}/standard/v1/payments/${encodeURIComponent(providerRef)}`,
      headers: {
        Authorization: `Bearer ${this.config.clientSecret}`,
        "X-Country": this.config.country,
        "X-Currency": this.config.currency,
      },
    });
    if (res.status !== 200) return "unknown";
    const parsed = JSON.parse(res.body) as {
      data?: { transaction?: { status?: string } };
    };
    return STATUS_MAP[parsed.data?.transaction?.status ?? ""] ?? "unknown";
  }

  verifyInboundSignature(payload: string, signature: string): boolean {
    const expected = createHmac("sha256", this.config.callbackSecret).update(payload).digest();
    let received: Buffer;
    try {
      received = Buffer.from(signature, "base64");
    } catch {
      return false;
    }
    if (received.length !== expected.length) return false;
    return timingSafeEqual(expected, received);
  }

  parseWebhook(payload: string): ParsedWebhook {
    const raw = JSON.parse(payload) as Record<string, unknown>;
    const transaction = (raw["transaction"] ?? {}) as Record<string, unknown>;
    const reference = String(transaction["id"] ?? "");
    return {
      eventId: `airtel:${reference}:${String(transaction["status"] ?? "")}`,
      somaReference: reference,
      status: STATUS_MAP[String(transaction["status"] ?? "")] ?? "unknown",
      raw,
    };
  }
}
