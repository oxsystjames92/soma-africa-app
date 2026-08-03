import { describe, expect, it } from "vitest";
import { InMemoryRateLimiter, RateLimitedError } from "./rate-limiter.js";

describe("InMemoryRateLimiter", () => {
  it("allows up to the limit then blocks", async () => {
    const limiter = new InMemoryRateLimiter(3, 60_000, () => 1000);
    await limiter.consume("ip-a");
    await limiter.consume("ip-a");
    await limiter.consume("ip-a");
    await expect(limiter.consume("ip-a")).rejects.toThrow(RateLimitedError);
  });

  it("tracks callers independently", async () => {
    const limiter = new InMemoryRateLimiter(1, 60_000, () => 1000);
    await limiter.consume("ip-a");
    await expect(limiter.consume("ip-b")).resolves.toBeUndefined();
  });

  it("reopens the allowance after the window passes", async () => {
    let now = 1000;
    const limiter = new InMemoryRateLimiter(1, 60_000, () => now);
    await limiter.consume("ip-a");
    await expect(limiter.consume("ip-a")).rejects.toThrow(RateLimitedError);
    now += 60_001;
    await expect(limiter.consume("ip-a")).resolves.toBeUndefined();
  });
});
