import { describe, expect, it } from "vitest";
import { CurrencyMismatchError, InvalidMoneyError } from "./errors.js";
import { Money } from "./money.js";

describe("Money", () => {
  it("constructs from integer number and bigint minor units", () => {
    expect(Money.of(5000, "UGX").minorUnits).toBe(5000n);
    expect(Money.of(5000n, "UGX").minorUnits).toBe(5000n);
  });

  it("rejects float construction", () => {
    expect(() => Money.of(10.5, "UGX")).toThrow(InvalidMoneyError);
    expect(() => Money.of(0.1, "UGX")).toThrow(InvalidMoneyError);
  });

  it("rejects unsafe integer numbers", () => {
    expect(() => Money.of(Number.MAX_SAFE_INTEGER + 1, "UGX")).toThrow(InvalidMoneyError);
  });

  it("rejects unknown currencies", () => {
    expect(() => Money.of(100n, "XXX" as never)).toThrow(InvalidMoneyError);
  });

  it("adds and subtracts same-currency amounts", () => {
    const a = Money.of(1500n, "UGX");
    const b = Money.of(500n, "UGX");
    expect(a.add(b).minorUnits).toBe(2000n);
    expect(a.subtract(b).minorUnits).toBe(1000n);
  });

  it("rejects cross-currency math", () => {
    const ugx = Money.of(1000n, "UGX");
    const rwf = Money.of(1000n, "RWF");
    expect(() => ugx.add(rwf)).toThrow(CurrencyMismatchError);
    expect(() => ugx.subtract(rwf)).toThrow(CurrencyMismatchError);
    expect(() => ugx.compare(rwf)).toThrow(CurrencyMismatchError);
  });

  it("multiplies by integer factors only", () => {
    expect(Money.of(800n, "UGX").times(10).minorUnits).toBe(8000n);
    expect(() => Money.of(800n, "UGX").times(1.5)).toThrow(InvalidMoneyError);
  });

  it("compares and checks equality", () => {
    expect(Money.of(1n, "UGX").compare(Money.of(2n, "UGX"))).toBe(-1);
    expect(Money.of(2n, "UGX").equals(Money.of(2n, "UGX"))).toBe(true);
    expect(Money.of(2n, "UGX").equals(Money.of(2n, "RWF"))).toBe(false);
  });

  it("serializes bigint safely to JSON", () => {
    expect(JSON.parse(JSON.stringify(Money.of(123n, "UGX")))).toEqual({
      minorUnits: "123",
      currency: "UGX",
    });
  });
});
