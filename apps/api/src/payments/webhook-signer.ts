import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Outbound webhook signatures (CLAUDE.md §8.5).
 *
 * Header: `Soma-Signature: t=<unix seconds>,v1=<hex hmac-sha256>`
 * Signed material is `${timestamp}.${body}` — binding the timestamp into the
 * MAC is what stops an attacker replaying a captured-but-valid delivery, since
 * they cannot re-sign a fresh timestamp without the secret.
 */
export const SIGNATURE_HEADER = "soma-signature";

/** Deliveries older than this are refused by receivers following our spec. */
export const DEFAULT_TOLERANCE_SECONDS = 300;

export function signPayload(body: string, secret: string, timestampSeconds: number): string {
  const mac = createHmac("sha256", secret).update(`${timestampSeconds}.${body}`).digest("hex");
  return `t=${timestampSeconds},v1=${mac}`;
}

/**
 * Reference verifier — the logic we document for receivers and hold ourselves
 * to in tests. Fails closed on anything malformed.
 */
export function verifySignature(
  body: string,
  header: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS,
): boolean {
  const parts = new Map(
    header
      .split(",")
      .map((segment) => segment.trim().split("="))
      .filter((pair): pair is [string, string] => pair.length === 2)
      .map(([k, v]) => [k, v]),
  );

  const timestamp = Number(parts.get("t"));
  const received = parts.get("v1");
  if (!Number.isFinite(timestamp) || !received) return false;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest();
  let receivedBuf: Buffer;
  try {
    receivedBuf = Buffer.from(received, "hex");
  } catch {
    return false;
  }
  if (receivedBuf.length !== expected.length) return false;
  return timingSafeEqual(expected, receivedBuf);
}
