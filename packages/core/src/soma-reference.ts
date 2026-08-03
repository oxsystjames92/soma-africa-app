import { randomBytes } from "node:crypto";
import { DomainError } from "./errors.js";

export class InvalidReferenceError extends DomainError {
  readonly code = "INVALID_REFERENCE";
}

/**
 * Crockford base32: no I, L, O or U, so a reference read aloud over a phone
 * call or copied off a receipt cannot be transcribed into a different one.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const BODY_LENGTH = 12;
const PREFIX = "SOMA";

/** Crockford's documented substitutions for the characters we excluded. */
const NORMALIZE: Record<string, string> = { I: "1", L: "1", O: "0", U: "V" };

function checkChar(body: string): string {
  // Weighted mod-32 sum: catches single-character typos and transpositions,
  // which a plain checksum would miss.
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    sum += ALPHABET.indexOf(body[i]!) * (i + 1);
  }
  return ALPHABET[sum % 32]!;
}

/**
 * A Soma payment reference: the idempotency key that ties a payer's intent,
 * a provider's transaction, and a ledger entry together across every rail.
 *
 * Format: SOMA-XXXX-XXXX-XXXXC (12 body chars + 1 check character).
 */
export class SomaReference {
  private constructor(readonly value: string) {}

  static generate(): SomaReference {
    // Rejection-sample whole bytes to keep the alphabet uniform; a plain
    // modulo would bias the first 8 characters.
    let body = "";
    while (body.length < BODY_LENGTH) {
      for (const byte of randomBytes(BODY_LENGTH)) {
        if (byte < 224) {
          body += ALPHABET[byte % 32]!;
          if (body.length === BODY_LENGTH) break;
        }
      }
    }
    return new SomaReference(`${PREFIX}${body}${checkChar(body)}`);
  }

  /** Accepts any grouping or case: "soma-a1b2 c3d4-e5f6g" parses. */
  static parse(input: string): SomaReference {
    const cleaned = input.toUpperCase().replace(/[\s-]/g, "");
    if (!cleaned.startsWith(PREFIX)) {
      throw new InvalidReferenceError("Reference must start with SOMA");
    }
    // Normalize the body only — the prefix contains an O that must survive.
    const rest = cleaned.slice(PREFIX.length).replace(/[ILOU]/g, (c) => NORMALIZE[c]!);
    if (rest.length !== BODY_LENGTH + 1) {
      throw new InvalidReferenceError("Reference is the wrong length");
    }
    const body = rest.slice(0, BODY_LENGTH);
    if (checkChar(body) !== rest[BODY_LENGTH]) {
      throw new InvalidReferenceError("Reference failed its checksum");
    }
    return new SomaReference(`${PREFIX}${rest}`);
  }

  static isValid(input: string): boolean {
    try {
      SomaReference.parse(input);
      return true;
    } catch {
      return false;
    }
  }

  /** Grouped for humans: SOMA-XXXX-XXXX-XXXXC */
  format(): string {
    const rest = this.value.slice(PREFIX.length);
    return `${PREFIX}-${rest.slice(0, 4)}-${rest.slice(4, 8)}-${rest.slice(8)}`;
  }

  toString(): string {
    return this.value;
  }
}
