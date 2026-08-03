import { describe, expect, it } from "vitest";
import { signPayload, verifySignature } from "./webhook-signer.js";

const SECRET = "whsec_test_secret_value";
const BODY = JSON.stringify({ type: "payment.succeeded", data: { amountMinor: "45000000" } });
const NOW = 1_800_000_000;

describe("webhook signatures", () => {
  it("signs and verifies a round trip", () => {
    const header = signPayload(BODY, SECRET, NOW);
    expect(header).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    expect(verifySignature(BODY, header, SECRET, NOW)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const header = signPayload(BODY, SECRET, NOW);
    const tampered = BODY.replace("45000000", "1");
    expect(verifySignature(tampered, header, SECRET, NOW)).toBe(false);
  });

  it("rejects the wrong secret", () => {
    const header = signPayload(BODY, SECRET, NOW);
    expect(verifySignature(BODY, header, "whsec_other", NOW)).toBe(false);
  });

  it("rejects a replayed delivery outside the tolerance window", () => {
    const header = signPayload(BODY, SECRET, NOW);
    // Captured and replayed six minutes later.
    expect(verifySignature(BODY, header, SECRET, NOW + 360)).toBe(false);
    // Still inside the window.
    expect(verifySignature(BODY, header, SECRET, NOW + 120)).toBe(true);
    // Clock skew in the other direction is tolerated symmetrically.
    expect(verifySignature(BODY, header, SECRET, NOW - 120)).toBe(true);
  });

  it("rejects a signature lifted onto a fresher timestamp", () => {
    const original = signPayload(BODY, SECRET, NOW);
    const mac = original.split("v1=")[1]!;
    // An attacker cannot re-sign a new timestamp without the secret, and the
    // timestamp is inside the signed material — so swapping it invalidates.
    expect(verifySignature(BODY, `t=${NOW + 300},v1=${mac}`, SECRET, NOW + 300)).toBe(false);
  });

  it("fails closed on malformed headers", () => {
    for (const header of ["", "garbage", "t=abc,v1=abc", `t=${NOW}`, `v1=deadbeef`, `t=${NOW},v1=`]) {
      expect(verifySignature(BODY, header, SECRET, NOW)).toBe(false);
    }
  });
});
