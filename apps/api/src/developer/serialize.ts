/**
 * JSON serialization for the public API.
 *
 * Money is bigint minor units. `JSON.stringify` throws on bigint, and coercing
 * to Number would silently round anything past 2^53 — so every bigint crosses
 * the wire as a decimal string. Consumers parse it back with BigInt, never
 * with parseFloat.
 */
export function serialize<T>(value: T): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serialize(v)]),
    );
  }
  return value;
}
