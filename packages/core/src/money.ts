import { CurrencyMismatchError, InvalidMoneyError } from "./errors.js";

/** ISO-4217 currencies Soma operates in. Extend deliberately, not implicitly. */
export const CURRENCIES = ["UGX", "RWF", "BIF", "ETB", "KES", "TZS", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/**
 * Money value object. Amount is ALWAYS bigint minor units (CLAUDE.md §3).
 * Construction from floats is rejected; cross-currency arithmetic throws.
 */
export class Money {
  private constructor(
    readonly minorUnits: bigint,
    readonly currency: Currency,
  ) {}

  static of(minorUnits: bigint | number, currency: Currency): Money {
    if (!CURRENCIES.includes(currency)) {
      throw new InvalidMoneyError(`Unknown currency: ${String(currency)}`);
    }
    if (typeof minorUnits === "number") {
      if (!Number.isInteger(minorUnits)) {
        throw new InvalidMoneyError(
          `Money must be integer minor units, got float: ${minorUnits}`,
        );
      }
      if (!Number.isSafeInteger(minorUnits)) {
        throw new InvalidMoneyError(
          `Amount exceeds safe integer range; pass a bigint: ${minorUnits}`,
        );
      }
      return new Money(BigInt(minorUnits), currency);
    }
    return new Money(minorUnits, currency);
  }

  static zero(currency: Currency): Money {
    return Money.of(0n, currency);
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits + other.minorUnits, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.minorUnits - other.minorUnits, this.currency);
  }

  /** Multiply by an integer factor (e.g. quantity). Floats rejected. */
  times(factor: bigint | number): Money {
    if (typeof factor === "number" && !Number.isInteger(factor)) {
      throw new InvalidMoneyError(`Multiplier must be an integer, got: ${factor}`);
    }
    return new Money(this.minorUnits * BigInt(factor), this.currency);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.minorUnits === other.minorUnits;
  }

  compare(other: Money): -1 | 0 | 1 {
    this.assertSameCurrency(other);
    if (this.minorUnits < other.minorUnits) return -1;
    if (this.minorUnits > other.minorUnits) return 1;
    return 0;
  }

  isNegative(): boolean {
    return this.minorUnits < 0n;
  }

  isZero(): boolean {
    return this.minorUnits === 0n;
  }

  toJSON(): { minorUnits: string; currency: Currency } {
    return { minorUnits: this.minorUnits.toString(), currency: this.currency };
  }

  toString(): string {
    return `${this.currency} ${this.minorUnits.toString()}`;
  }
}
