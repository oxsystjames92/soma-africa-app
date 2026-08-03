import { DomainError } from "@soma/core";

export class RateLimitedError extends DomainError {
  readonly code = "RATE_LIMITED";
  constructor() {
    super("Too many attempts. Wait a minute and try again.");
  }
}

export interface RateLimiter {
  /** Throws RateLimitedError when the caller has exceeded its allowance. */
  consume(key: string): Promise<void>;
}

/**
 * Fixed-window limiter guarding the unauthenticated payment-code lookup.
 * Without it, that endpoint is an oracle for enumerating a school's payment
 * codes one guess at a time.
 *
 * In-memory, so the allowance is per instance. Moving to Redis is required
 * before running more than one API replica.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit = 10,
    private readonly windowMs = 60_000,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async consume(key: string): Promise<void> {
    const current = this.now();
    const entry = this.hits.get(key);

    if (!entry || entry.resetAt <= current) {
      this.hits.set(key, { count: 1, resetAt: current + this.windowMs });
      this.sweep(current);
      return;
    }
    if (entry.count >= this.limit) throw new RateLimitedError();
    entry.count += 1;
  }

  /** Drop expired windows so the map cannot grow without bound. */
  private sweep(current: number): void {
    if (this.hits.size < 10_000) return;
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= current) this.hits.delete(key);
    }
  }
}
