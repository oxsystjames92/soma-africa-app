import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { Money } from "@soma/core";
import { AirtelMoneyAdapter } from "./airtel-money-adapter.js";
import { MtnMomoAdapter } from "./mtn-momo-adapter.js";
import type { HttpRequest, HttpResponse, HttpTransport } from "./transport.js";

/** Records what an adapter sent and replays canned responses. No live money. */
class FakeTransport implements HttpTransport {
  readonly sent: HttpRequest[] = [];
  constructor(private responses: HttpResponse[] = []) {}

  queue(...responses: HttpResponse[]): void {
    this.responses.push(...responses);
  }

  async send(request: HttpRequest): Promise<HttpResponse> {
    this.sent.push(request);
    return this.responses.shift() ?? { status: 500, body: "{}" };
  }
}

const CALLBACK_SECRET = "sandbox-callback-secret";
let transport: FakeTransport;

beforeEach(() => {
  transport = new FakeTransport();
});

describe("MtnMomoAdapter", () => {
  const build = () =>
    new MtnMomoAdapter(
      {
        mode: "partner",
        baseUrl: "https://sandbox.example/mtn",
        subscriptionKey: "sub-key",
        apiUser: "api-user",
        apiKey: "api-key",
        callbackSecret: CALLBACK_SECRET,
        targetEnvironment: "sandbox",
      },
      transport,
    );

  it("refuses to construct in direct mode until Soma holds a licence", () => {
    expect(
      () =>
        new MtnMomoAdapter(
          {
            mode: "direct",
            baseUrl: "https://sandbox.example/mtn",
            subscriptionKey: "s",
            apiUser: "u",
            apiKey: "k",
            callbackSecret: CALLBACK_SECRET,
            targetEnvironment: "sandbox",
          },
          transport,
        ),
    ).toThrow(/not licensed/);
  });

  it("initiates a debit prompt and keeps credentials out of the URL", async () => {
    transport.queue({ status: 202, body: "" });
    const result = await build().initiatePayment({
      somaReference: "SOMAREF1",
      amount: Money.of(450_000_00n, "UGX"),
      payerPhone: "+256700123456",
      narration: "Term 1 fees",
    });

    expect(result).toEqual({ status: "accepted", providerRef: "SOMAREF1" });

    const req = transport.sent[0]!;
    expect(req.headers["Authorization"]).toBe("Bearer api-key");
    expect(req.url).not.toContain("api-key");
    expect(req.url).not.toContain("sub-key");
    // MSISDN normalized: MTN rejects the leading plus.
    expect(JSON.parse(req.body!).payer.partyId).toBe("256700123456");
  });

  it("treats a non-202 initiation as rejected", async () => {
    transport.queue({ status: 400, body: '{"message":"bad request"}' });
    const result = await build().initiatePayment({
      somaReference: "SOMAREF2",
      amount: Money.of(1000n, "UGX"),
      payerPhone: "+256700123456",
      narration: "fees",
    });
    expect(result.status).toBe("rejected");
  });

  it("maps provider statuses onto Soma's vocabulary", async () => {
    const adapter = build();
    transport.queue(
      { status: 200, body: '{"status":"SUCCESSFUL"}' },
      { status: 200, body: '{"status":"PENDING"}' },
      { status: 200, body: '{"status":"REJECTED"}' },
      { status: 200, body: '{"status":"SOMETHING_NEW"}' },
      { status: 404, body: "" },
    );
    expect(await adapter.checkStatus("r")).toBe("succeeded");
    expect(await adapter.checkStatus("r")).toBe("pending");
    expect(await adapter.checkStatus("r")).toBe("failed");
    // An unrecognized status must never be read as success.
    expect(await adapter.checkStatus("r")).toBe("unknown");
    expect(await adapter.checkStatus("r")).toBe("unknown");
  });

  it("verifies genuine signatures and rejects forgeries", () => {
    const adapter = build();
    const payload = '{"externalId":"SOMAREF1","status":"SUCCESSFUL"}';
    const valid = createHmac("sha256", CALLBACK_SECRET).update(payload).digest("hex");

    expect(adapter.verifyInboundSignature(payload, valid)).toBe(true);
    // Wrong secret, tampered payload, truncated, and junk all fail closed.
    expect(
      adapter.verifyInboundSignature(
        payload,
        createHmac("sha256", "wrong").update(payload).digest("hex"),
      ),
    ).toBe(false);
    expect(adapter.verifyInboundSignature('{"externalId":"OTHER"}', valid)).toBe(false);
    expect(adapter.verifyInboundSignature(payload, valid.slice(0, 10))).toBe(false);
    expect(adapter.verifyInboundSignature(payload, "not-hex-at-all")).toBe(false);
    expect(adapter.verifyInboundSignature(payload, "")).toBe(false);
  });

  it("parses a callback into the normalized event shape", () => {
    const parsed = build().parseWebhook('{"externalId":"SOMAREF1","status":"SUCCESSFUL"}');
    expect(parsed.somaReference).toBe("SOMAREF1");
    expect(parsed.status).toBe("succeeded");
    expect(parsed.eventId).toBe("mtn:SOMAREF1:SUCCESSFUL");
  });
});

describe("AirtelMoneyAdapter", () => {
  const build = () =>
    new AirtelMoneyAdapter(
      {
        mode: "partner",
        baseUrl: "https://sandbox.example/airtel",
        clientId: "client-id",
        clientSecret: "client-secret",
        callbackSecret: CALLBACK_SECRET,
        country: "UG",
        currency: "UGX",
      },
      transport,
    );

  it("refuses to construct in direct mode until Soma holds a licence", () => {
    expect(
      () =>
        new AirtelMoneyAdapter(
          {
            mode: "direct",
            baseUrl: "https://sandbox.example/airtel",
            clientId: "c",
            clientSecret: "s",
            callbackSecret: CALLBACK_SECRET,
            country: "UG",
            currency: "UGX",
          },
          transport,
        ),
    ).toThrow(/not licensed/);
  });

  it("initiates a payment and returns the provider's transaction id", async () => {
    transport.queue({
      status: 200,
      body: JSON.stringify({
        status: { success: true },
        data: { transaction: { id: "AIRTEL-TX-9" } },
      }),
    });
    const result = await build().initiatePayment({
      somaReference: "SOMAREF3",
      amount: Money.of(200_000_00n, "UGX"),
      payerPhone: "+256750999888",
      narration: "Term 1 fees",
    });
    expect(result).toEqual({ status: "accepted", providerRef: "AIRTEL-TX-9" });
    expect(transport.sent[0]!.url).not.toContain("client-secret");
  });

  it("treats an unsuccessful body as rejected even on HTTP 200", async () => {
    transport.queue({ status: 200, body: JSON.stringify({ status: { success: false } }) });
    const result = await build().initiatePayment({
      somaReference: "SOMAREF4",
      amount: Money.of(1000n, "UGX"),
      payerPhone: "+256750999888",
      narration: "fees",
    });
    expect(result.status).toBe("rejected");
  });

  it("maps Airtel transaction codes", async () => {
    const adapter = build();
    transport.queue(
      { status: 200, body: JSON.stringify({ data: { transaction: { status: "TS" } } }) },
      { status: 200, body: JSON.stringify({ data: { transaction: { status: "TF" } } }) },
      { status: 200, body: JSON.stringify({ data: { transaction: { status: "TA" } } }) },
      { status: 200, body: JSON.stringify({ data: { transaction: { status: "??" } } }) },
    );
    expect(await adapter.checkStatus("t")).toBe("succeeded");
    expect(await adapter.checkStatus("t")).toBe("failed");
    expect(await adapter.checkStatus("t")).toBe("pending");
    expect(await adapter.checkStatus("t")).toBe("unknown");
  });

  it("verifies base64 signatures and rejects forgeries", () => {
    const adapter = build();
    const payload = '{"transaction":{"id":"SOMAREF3","status":"TS"}}';
    const valid = createHmac("sha256", CALLBACK_SECRET).update(payload).digest("base64");
    expect(adapter.verifyInboundSignature(payload, valid)).toBe(true);
    expect(adapter.verifyInboundSignature(payload, "AAAA")).toBe(false);
    expect(adapter.verifyInboundSignature(payload, "")).toBe(false);
  });
});
