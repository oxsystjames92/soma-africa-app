import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Webhook signature verification for receivers.
 *
 * Shipping this in the SDK is deliberate: every integrator needs it, and the
 * ones who hand-roll it get it wrong in the same three ways — comparing with
 * `===` (timing leak), ignoring the timestamp (replayable forever), or
 * verifying a re-serialized object instead of the raw bytes.
 */

export const DEFAULT_TOLERANCE_SECONDS = 300;

export class SignatureVerificationError extends Error {}

/**
 * Verify a delivery.
 *
 * `rawBody` MUST be the exact bytes received. If your framework has already
 * parsed the body, re-stringifying it produces different bytes and the
 * signature will not match — configure raw body access instead.
 */
export function verifyWebhookSignature(options: {
  rawBody: string;
  signatureHeader: string;
  secret: string;
  toleranceSeconds?: number;
  nowSeconds?: number;
}): boolean {
  const {
    rawBody,
    signatureHeader,
    secret,
    toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
    nowSeconds = Math.floor(Date.now() / 1000),
  } = options;

  const parts = new Map(
    signatureHeader
      .split(",")
      .map((segment) => segment.trim().split("="))
      .filter((pair): pair is [string, string] => pair.length === 2),
  );

  const timestamp = Number(parts.get("t"));
  const received = parts.get("v1");
  if (!Number.isFinite(timestamp) || !received) return false;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(received, "hex");
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(expected, actual);
}

/** Throwing variant, for handlers that prefer to fail loudly. */
export function assertWebhookSignature(options: Parameters<typeof verifyWebhookSignature>[0]): void {
  if (!verifyWebhookSignature(options)) {
    throw new SignatureVerificationError("Webhook signature is invalid or expired");
  }
}
