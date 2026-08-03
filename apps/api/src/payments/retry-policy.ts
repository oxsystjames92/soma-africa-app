/** At-least-once delivery schedule (CLAUDE.md §8.5). */

export const MAX_ATTEMPTS = 8;

const BASE_DELAY_MS = 5_000;
const MAX_DELAY_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Exponential backoff with full jitter. Jitter matters: without it, every
 * delivery queued during an outage retries in lockstep and stampedes the
 * receiver the moment it recovers.
 *
 * Schedule (pre-jitter): 5s, 10s, 20s, 40s, 80s, 160s, 320s — then dead.
 */
export function nextAttemptDelayMs(attempt: number, random: () => number = Math.random): number {
  const ceiling = Math.min(BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1), MAX_DELAY_MS);
  return Math.floor(random() * ceiling);
}

export function isExhausted(attempts: number): boolean {
  return attempts >= MAX_ATTEMPTS;
}
