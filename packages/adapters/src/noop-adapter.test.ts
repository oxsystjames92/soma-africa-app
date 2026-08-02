import { describe, expect, it } from "vitest";
import { Money } from "@soma/core";
import { NoopAdapter } from "./noop-adapter.js";

describe("NoopAdapter", () => {
  const adapter = new NoopAdapter();

  it("accepts initiation and returns a provider ref", async () => {
    const result = await adapter.initiatePayment({
      somaReference: "SOMA-REF-1",
      amount: Money.of(10000n, "UGX"),
      payerPhone: "+256700000001",
      narration: "Term 1 fees",
    });
    expect(result).toEqual({ status: "accepted", providerRef: "noop-SOMA-REF-1" });
  });

  it("fails signature verification closed", () => {
    expect(adapter.verifyInboundSignature("{}", "any-signature")).toBe(false);
  });

  it("parses a webhook payload into the normalized shape", () => {
    const parsed = adapter.parseWebhook(
      JSON.stringify({ eventId: "evt-1", somaReference: "SOMA-REF-1" }),
    );
    expect(parsed.eventId).toBe("evt-1");
    expect(parsed.somaReference).toBe("SOMA-REF-1");
    expect(parsed.status).toBe("unknown");
  });
});
