import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { Soma } from "./client.js";
import { AuthenticationError, NotFoundError, PermissionError, ValidationError } from "./errors.js";
import { verifyWebhookSignature } from "./webhooks.js";

function fakeFetch(responses: { status: number; body?: unknown }[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses.shift() ?? { status: 500, body: {} };
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      json: async () => next.body ?? {},
    } as Response;
  });
  return { impl: impl as unknown as typeof globalThis.fetch, calls };
}

function client(responses: { status: number; body?: unknown }[], apiKey = "sk_test_abc_secret") {
  const { impl, calls } = fakeFetch(responses);
  return {
    soma: new Soma({ apiKey, baseUrl: "https://api.test", fetch: impl, maxRetries: 2 }),
    calls,
  };
}

describe("authentication", () => {
  it("sends the key in an Authorization header, never the URL", async () => {
    const { soma, calls } = client([{ status: 200, body: { data: [], hasMore: false } }]);
    await soma.students.list();

    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk_test_abc_secret");
    expect(calls[0]!.url).not.toContain("sk_test");
    expect(calls[0]!.url).not.toContain("secret");
  });

  it("refuses to construct without a key", () => {
    expect(() => new Soma({ apiKey: "" })).toThrow(/API key is required/);
  });

  it("knows whether it is pointed at the sandbox", () => {
    expect(new Soma({ apiKey: "sk_test_x_y" }).isSandbox).toBe(true);
    expect(new Soma({ apiKey: "sk_live_x_y" }).isSandbox).toBe(false);
  });
});

describe("errors", () => {
  it("maps status codes to typed errors", async () => {
    const cases = [
      [401, AuthenticationError],
      [403, PermissionError],
      [404, NotFoundError],
      [400, ValidationError],
    ] as const;

    for (const [status, Expected] of cases) {
      const { soma } = client([{ status, body: { code: "x", message: "nope" } }]);
      await expect(soma.students.list()).rejects.toBeInstanceOf(Expected);
    }
  });

  it("surfaces the server's code and message", async () => {
    const { soma } = client([
      { status: 403, body: { code: "INSUFFICIENT_SCOPE", message: 'missing "students:read"' } },
    ]);
    await expect(soma.students.list()).rejects.toMatchObject({
      code: "INSUFFICIENT_SCOPE",
      status: 403,
    });
  });
});

describe("retries", () => {
  it("retries a 503 and succeeds", async () => {
    const { soma, calls } = client([
      { status: 503, body: {} },
      { status: 200, body: { data: [{ id: "s1" }], hasMore: false } },
    ]);
    const page = await soma.students.list();
    expect(page.data).toHaveLength(1);
    expect(calls).toHaveLength(2);
  });

  it("never retries a 400 — the request will fail identically", async () => {
    const { soma, calls } = client([{ status: 400, body: { message: "bad" } }]);
    await expect(soma.students.list()).rejects.toBeInstanceOf(ValidationError);
    expect(calls).toHaveLength(1);
  });

  it("gives up after the retry budget", async () => {
    const { soma, calls } = client([
      { status: 500, body: {} },
      { status: 500, body: {} },
      { status: 500, body: {} },
    ]);
    await expect(soma.students.list()).rejects.toThrow();
    expect(calls).toHaveLength(3); // initial + 2 retries
  });
});

describe("requests", () => {
  it("builds cursor pagination query strings", async () => {
    const { soma, calls } = client([{ status: 200, body: { data: [], hasMore: false } }]);
    await soma.students.list({ limit: 50, cursor: "abc" });
    expect(calls[0]!.url).toBe("https://api.test/v1/students?limit=50&cursor=abc");
  });

  it("omits absent options rather than sending undefined", async () => {
    const { soma, calls } = client([{ status: 200, body: { data: [], hasMore: false } }]);
    await soma.invoices.list({ limit: 10 });
    expect(calls[0]!.url).toBe("https://api.test/v1/invoices?limit=10");
  });

  it("passes an idempotency key when given one", async () => {
    const { soma, calls } = client([{ status: 201, body: { id: "e1" } }]);
    await soma.webhooks.createEndpoint("https://example.com/hook", "idem-123");
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("idem-123");
  });

  it("handles 204 responses without parsing a body", async () => {
    const { soma } = client([{ status: 204 }]);
    await expect(soma.webhooks.deleteEndpoint("e1")).resolves.toBeUndefined();
  });
});

describe("webhook verification", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ type: "payment.succeeded" });
  const now = 1_800_000_000;
  const sign = (t: number) =>
    `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;

  it("accepts a genuine, fresh signature", () => {
    expect(
      verifyWebhookSignature({ rawBody: body, signatureHeader: sign(now), secret, nowSeconds: now }),
    ).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(
      verifyWebhookSignature({
        rawBody: JSON.stringify({ type: "payment.failed" }),
        signatureHeader: sign(now),
        secret,
        nowSeconds: now,
      }),
    ).toBe(false);
  });

  it("rejects a replay outside the tolerance window", () => {
    expect(
      verifyWebhookSignature({
        rawBody: body,
        signatureHeader: sign(now),
        secret,
        nowSeconds: now + 400,
      }),
    ).toBe(false);
  });

  it("rejects the wrong secret", () => {
    expect(
      verifyWebhookSignature({
        rawBody: body,
        signatureHeader: sign(now),
        secret: "whsec_other",
        nowSeconds: now,
      }),
    ).toBe(false);
  });

  it("fails closed on malformed headers", () => {
    for (const header of ["", "garbage", "t=abc,v1=zz", `t=${now}`, "v1=deadbeef"]) {
      expect(
        verifyWebhookSignature({ rawBody: body, signatureHeader: header, secret, nowSeconds: now }),
      ).toBe(false);
    }
  });
});
