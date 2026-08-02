/** PII redaction for structured logs (CLAUDE.md §8.7). */

const SENSITIVE_KEYS = /pass|password|secret|token|otp|authorization|signature|apikey|api_key/i;
const PII_KEYS = /email|phone|msisdn|name/i;

function maskString(value: string): string {
  if (value.length <= 4) return "***";
  return `***${value.slice(-4)}`;
}

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value === null || typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.test(key)) {
      out[key] = "[REDACTED]";
    } else if (PII_KEYS.test(key) && typeof v === "string") {
      out[key] = maskString(v);
    } else {
      out[key] = redact(v);
    }
  }
  return out;
}
