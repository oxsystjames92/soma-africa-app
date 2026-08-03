/**
 * Adversarial tests for the reconciliation matcher.
 *
 * Reconciliation is the product's trust core (CLAUDE.md §7 F9). The failure
 * that matters is not "we failed to match" — a bursar can fix that in a
 * minute. It is "we matched confidently and wrongly", which credits one
 * family's money to another child and is discovered weeks later, if ever.
 * These tests are written to try to cause that failure.
 */
import { describe, expect, it } from "vitest";
import {
  AMBIGUITY_MARGIN,
  AUTO_CONFIRM_THRESHOLD,
  REVIEW_THRESHOLD,
  matchPayment,
  type StudentCandidate,
} from "./reconciliation-matcher.js";

const amina: StudentCandidate = {
  studentId: "s-amina",
  paymentCode: "1009876543",
  regNumber: "STM/2024/0912",
  fullName: "Amina Nakato",
};
const joseph: StudentCandidate = {
  studentId: "s-joseph",
  paymentCode: "1004445555",
  regNumber: "STM/2024/0451",
  fullName: "Joseph Okello",
};
const roster = [amina, joseph];

describe("structured identifiers", () => {
  it("auto-confirms an exact payment code", () => {
    const outcome = matchPayment({ paymentCode: "1009876543" }, roster);
    expect(outcome.decision).toBe("auto");
    expect(outcome).toMatchObject({ best: { studentId: "s-amina", confidence: 1 } });
  });

  it("ignores separators and case in codes", () => {
    for (const code of ["stm/2024/0912", "STM-2024-0912", " STM 2024 0912 "]) {
      const outcome = matchPayment({ paymentCode: code }, roster);
      expect(outcome.decision).toBe("auto");
      expect(outcome).toMatchObject({ best: { studentId: "s-amina", strategy: "reg_number" } });
    }
  });

  it("finds a code embedded in free-text narration", () => {
    const outcome = matchPayment({ narration: "school fees for 1009876543 term 1" }, roster);
    expect(outcome).toMatchObject({
      decision: "auto",
      best: { studentId: "s-amina", strategy: "code_in_narration" },
    });
  });

  it("does not let a short identifier match by coincidence", () => {
    // A 4-character code would appear inside all kinds of unrelated text.
    const shortCoded = [{ studentId: "s-x", paymentCode: "1234", fullName: "Zed Zulu" }];
    const outcome = matchPayment({ narration: "invoice 91234 paid" }, shortCoded);
    expect(outcome.decision).toBe("unmatched");
  });

  it("sends a mid-length embedded code to review rather than auto-confirming", () => {
    // 6 characters: long enough to be worth proposing, short enough that a
    // coincidental substring is plausible. A human decides.
    const midCoded = [{ studentId: "s-y", paymentCode: "AB1234", fullName: "Mid Length" }];
    const outcome = matchPayment({ narration: "payment ref AB1234 for term 2" }, midCoded);
    expect(outcome.decision).toBe("review");
  });

  it("prefers the exact code over a name that resembles someone else", () => {
    const outcome = matchPayment(
      { paymentCode: "1009876543", payerName: "Joseph Okello" },
      roster,
    );
    expect(outcome).toMatchObject({ decision: "auto", best: { studentId: "s-amina" } });
  });
});

describe("ambiguity — the case that must never auto-confirm", () => {
  it("sends two identically named students to review, not to a coin flip", () => {
    const twins: StudentCandidate[] = [
      { studentId: "s-1", paymentCode: "1111111111", fullName: "John Mukasa" },
      { studentId: "s-2", paymentCode: "2222222222", fullName: "John Mukasa" },
    ];
    const outcome = matchPayment({ payerName: "John Mukasa" }, twins);

    expect(outcome.decision).toBe("review");
    expect(outcome).toMatchObject({ reason: expect.stringContaining("Ambiguous") });
  });

  it("refuses to auto-confirm even when both tied candidates score perfectly", () => {
    // Two students sharing a payment code should be impossible, but a bad
    // import can create it. Confidence 1.0 twice is still not an answer.
    const duplicated: StudentCandidate[] = [
      { studentId: "s-1", paymentCode: "5555555555", fullName: "Aisha Nabirye" },
      { studentId: "s-2", paymentCode: "5555555555", fullName: "Different Child" },
    ];
    const outcome = matchPayment({ paymentCode: "5555555555" }, duplicated);
    expect(outcome.decision).toBe("review");
  });

  it("auto-confirms when the leader is clear of the runner-up", () => {
    const outcome = matchPayment({ paymentCode: "1009876543", narration: "Joseph" }, roster);
    expect(outcome.decision).toBe("auto");
  });

  it("treats a gap exactly at the margin as ambiguous", () => {
    const pair: StudentCandidate[] = [
      { studentId: "s-1", paymentCode: "9999999999", fullName: "Exact Code" },
      { studentId: "s-2", regNumber: "9999999999", fullName: "Reg Number" },
    ];
    // 1.00 vs 0.97 — a 0.03 gap, inside the 0.05 margin.
    const outcome = matchPayment({ paymentCode: "9999999999" }, pair);
    expect(1 - 0.97).toBeLessThanOrEqual(AMBIGUITY_MARGIN);
    expect(outcome.decision).toBe("review");
  });
});

describe("names are never enough on their own", () => {
  it("caps a perfect name match below the auto-confirm threshold", () => {
    const outcome = matchPayment({ payerName: "Amina Nakato" }, [amina]);
    expect(outcome.decision).toBe("review");
    expect(outcome).toMatchObject({ best: { strategy: "fuzzy_name" } });
    if (outcome.decision === "review") {
      expect(outcome.best.confidence).toBeLessThan(AUTO_CONFIRM_THRESHOLD);
    }
  });

  it("matches a reordered name into the review queue", () => {
    const outcome = matchPayment({ payerName: "Nakato Amina" }, [amina]);
    expect(outcome.decision).toBe("review");
    expect(outcome).toMatchObject({ best: { studentId: "s-amina" } });
  });

  it("leaves a weak name resemblance unmatched", () => {
    const outcome = matchPayment({ payerName: "Peter Wanyama" }, roster);
    expect(outcome.decision).toBe("unmatched");
    if (outcome.decision === "unmatched") {
      expect(outcome.reason).toContain("below the");
    }
  });

  it("does not match a sibling paying under the family surname", () => {
    const siblings: StudentCandidate[] = [
      { studentId: "s-1", paymentCode: "1111111111", fullName: "Amina Nakato" },
      { studentId: "s-2", paymentCode: "2222222222", fullName: "Joseph Nakato" },
    ];
    // The mobile-money account is in the parent's name only.
    const outcome = matchPayment({ payerName: "Nakato" }, siblings);
    expect(outcome.decision).not.toBe("auto");
  });
});

describe("degenerate and hostile input", () => {
  it("returns unmatched for an empty roster", () => {
    const outcome = matchPayment({ paymentCode: "1009876543" }, []);
    expect(outcome).toMatchObject({ decision: "unmatched", ranked: [] });
  });

  it("returns unmatched when the payment carries no signal at all", () => {
    expect(matchPayment({}, roster).decision).toBe("unmatched");
    expect(matchPayment({ narration: "", payerName: null }, roster).decision).toBe("unmatched");
  });

  it("survives candidates with missing identifiers", () => {
    const sparse: StudentCandidate[] = [
      { studentId: "s-1", fullName: "No Codes Here" },
      { studentId: "s-2", paymentCode: null, regNumber: null, fullName: "Also None" },
    ];
    expect(() => matchPayment({ paymentCode: "1009876543" }, sparse)).not.toThrow();
    expect(matchPayment({ paymentCode: "1009876543" }, sparse).decision).toBe("unmatched");
  });

  it("does not crash on punctuation-only or very long input", () => {
    expect(matchPayment({ narration: "!!!???" }, roster).decision).toBe("unmatched");
    expect(() => matchPayment({ narration: "x".repeat(10_000) }, roster)).not.toThrow();
  });
});

describe("determinism — an audit trail is worthless if the answer moves", () => {
  it("produces the identical outcome for the identical input", () => {
    const signal = { payerName: "Amina Nakato", narration: "fees" };
    const first = matchPayment(signal, roster);
    for (let i = 0; i < 20; i++) {
      expect(matchPayment(signal, roster)).toEqual(first);
    }
  });

  it("does not depend on the order candidates arrive in", () => {
    const signal = { paymentCode: "1009876543" };
    const forward = matchPayment(signal, [amina, joseph]);
    const backward = matchPayment(signal, [joseph, amina]);
    expect(forward).toEqual(backward);
  });

  it("breaks exact score ties by a stable rule, not by input order", () => {
    const a: StudentCandidate = { studentId: "s-aaa", paymentCode: "7777777777", fullName: "A" };
    const b: StudentCandidate = { studentId: "s-bbb", paymentCode: "7777777777", fullName: "B" };
    const forward = matchPayment({ paymentCode: "7777777777" }, [a, b]);
    const backward = matchPayment({ paymentCode: "7777777777" }, [b, a]);
    expect(forward).toEqual(backward);
    // Both are still sent to review — determinism is not a licence to guess.
    expect(forward.decision).toBe("review");
  });
});

describe("thresholds", () => {
  it("orders the thresholds coherently", () => {
    expect(REVIEW_THRESHOLD).toBeLessThan(AUTO_CONFIRM_THRESHOLD);
    expect(AUTO_CONFIRM_THRESHOLD).toBeLessThanOrEqual(1);
    expect(AMBIGUITY_MARGIN).toBeGreaterThan(0);
  });

  it("always explains itself", () => {
    const outcomes = [
      matchPayment({ paymentCode: "1009876543" }, roster),
      matchPayment({ payerName: "Amina Nakato" }, roster),
      matchPayment({ payerName: "Nobody At All" }, roster),
    ];
    for (const outcome of outcomes) {
      if (outcome.decision === "unmatched") expect(outcome.reason).toBeTruthy();
      else expect(outcome.best.evidence).toBeTruthy();
    }
  });
});
