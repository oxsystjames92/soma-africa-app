import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS, isExhausted, nextAttemptDelayMs } from "./retry-policy.js";

describe("retry policy", () => {
  it("doubles the ceiling on each attempt", () => {
    // random() pinned to 1 exposes the ceiling itself.
    const ceilings = [1, 2, 3, 4, 5].map((n) => nextAttemptDelayMs(n, () => 1));
    expect(ceilings).toEqual([5_000, 10_000, 20_000, 40_000, 80_000]);
  });

  it("applies full jitter so retries do not stampede", () => {
    expect(nextAttemptDelayMs(3, () => 0)).toBe(0);
    expect(nextAttemptDelayMs(3, () => 0.5)).toBe(10_000);
    expect(nextAttemptDelayMs(3, () => 1)).toBe(20_000);
  });

  it("caps the delay at six hours", () => {
    expect(nextAttemptDelayMs(50, () => 1)).toBe(6 * 60 * 60 * 1000);
  });

  it("gives up only after the full attempt budget", () => {
    expect(isExhausted(MAX_ATTEMPTS - 1)).toBe(false);
    expect(isExhausted(MAX_ATTEMPTS)).toBe(true);
  });
});
