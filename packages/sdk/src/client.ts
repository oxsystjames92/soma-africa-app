import { errorFor, ServerError, type SomaError } from "./errors.js";
import type {
  Invoice,
  ListOptions,
  Page,
  Payment,
  Student,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEndpointWithSecret,
} from "./types.js";

export interface SomaOptions {
  /** Your key: `sk_test_...` or `sk_live_...`. */
  apiKey: string;
  baseUrl?: string;
  /** Retries for transient failures. Default 3. */
  maxRetries?: number;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

const DEFAULT_BASE_URL = "https://api.soma-africa.com";
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The Soma API client.
 *
 * Retries transient failures with exponential backoff and jitter, and never
 * retries a request that failed because of its own content — a 400 will fail
 * identically the second time, and a blind retry on a write is how duplicate
 * payments happen.
 */
export class Soma {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(options: SomaOptions) {
    if (!options.apiKey) throw new Error("An API key is required");
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.maxRetries = options.maxRetries ?? 3;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  /** True when this client is pointed at sandbox data. */
  get isSandbox(): boolean {
    return this.apiKey.startsWith("sk_test_");
  }

  readonly students = {
    list: (options: ListOptions = {}): Promise<Page<Student>> =>
      this.request("GET", `/v1/students${query(options)}`),
    retrieve: (id: string): Promise<Student> => this.request("GET", `/v1/students/${id}`),
  };

  readonly invoices = {
    list: (options: ListOptions & { studentId?: string } = {}): Promise<Page<Invoice>> =>
      this.request("GET", `/v1/invoices${query(options)}`),
  };

  readonly payments = {
    list: (options: ListOptions = {}): Promise<Page<Payment>> =>
      this.request("GET", `/v1/payments${query(options)}`),
    retrieve: (somaReference: string): Promise<Payment> =>
      this.request("GET", `/v1/payments/${somaReference}`),
  };

  readonly webhooks = {
    listEndpoints: (): Promise<WebhookEndpoint[]> =>
      this.request("GET", "/v1/webhooks/endpoints"),

    /** The returned `secret` is shown once. Store it before discarding. */
    createEndpoint: (url: string, idempotencyKey?: string): Promise<WebhookEndpointWithSecret> =>
      this.request("POST", "/v1/webhooks/endpoints", { url }, idempotencyKey),

    deleteEndpoint: (id: string): Promise<void> =>
      this.request("DELETE", `/v1/webhooks/endpoints/${id}`),

    listDeliveries: (
      options: ListOptions & { status?: string } = {},
    ): Promise<Page<WebhookDelivery>> =>
      this.request("GET", `/v1/webhooks/deliveries${query(options)}`),
  };

  readonly sandbox = {
    /** Drive a test payment without a rail. Refused for live keys. */
    simulatePayment: (
      input: { amountMinor: string; studentId?: string; outcome?: "succeeded" | "failed" },
      idempotencyKey?: string,
    ): Promise<{ somaReference: string; status: string }> =>
      this.request("POST", "/v1/sandbox/simulate/payment", input, idempotencyKey),
  };

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    let lastError: SomaError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method,
          headers: {
            // Header, never a query string (CLAUDE.md §8.2).
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: controller.signal,
        });

        if (res.status === 204) return undefined as T;

        const payload = (await res.json().catch(() => ({}))) as {
          code?: string;
          message?: string;
        };

        if (res.ok) return payload as T;

        const error = errorFor(
          res.status,
          payload.code ?? "unknown_error",
          payload.message ?? `Request failed with ${res.status}`,
        );
        // A 4xx is the request's own fault; retrying changes nothing.
        if (!RETRYABLE.has(res.status)) throw error;
        lastError = error;
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError" && "code" in err) throw err;
        lastError =
          err instanceof Error && "status" in err
            ? (err as SomaError)
            : new ServerError(0, "network_error", "Could not reach Soma");
        if (lastError.status !== 0 && !RETRYABLE.has(lastError.status)) throw lastError;
      } finally {
        clearTimeout(timer);
      }

      if (attempt < this.maxRetries) {
        // Full jitter, so many clients recovering together do not synchronize.
        await sleep(Math.random() * 500 * 2 ** attempt);
      }
    }

    throw lastError ?? new ServerError(0, "unknown_error", "Request failed");
  }
}

// Takes `object` rather than Record<string, unknown>: TypeScript interfaces
// have no implicit index signature, so the option types would not satisfy it.
function query(options: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}
