import { describe, expect, it } from "vitest";
import { InvalidReferenceError, SomaReference } from "./soma-reference.js";

describe("SomaReference", () => {
  it("generates references that parse back", () => {
    for (let i = 0; i < 200; i++) {
      const ref = SomaReference.generate();
      expect(ref.value).toMatch(/^SOMA[0-9A-HJKMNP-TV-Z]{13}$/);
      expect(SomaReference.parse(ref.value).value).toBe(ref.value);
    }
  });

  it("generates unique references", () => {
    const seen = new Set(Array.from({ length: 2000 }, () => SomaReference.generate().value));
    expect(seen.size).toBe(2000);
  });

  it("accepts any grouping, case, or confusable characters", () => {
    const ref = SomaReference.generate();
    const messy = ref.format().toLowerCase().replace(/-/g, " ");
    expect(SomaReference.parse(messy).value).toBe(ref.value);
    // Crockford substitutions: O reads as 0, I and L as 1, U as V.
    expect(SomaReference.parse(ref.value.replace(/0/g, "O")).value).toBe(ref.value);
  });

  it("rejects a single-character typo", () => {
    const ref = SomaReference.generate().value;
    // Flip one body character to a different one and expect the checksum to catch it.
    const idx = 6;
    const swapped = ref[idx] === "2" ? "3" : "2";
    const typo = ref.slice(0, idx) + swapped + ref.slice(idx + 1);
    expect(SomaReference.isValid(typo)).toBe(false);
  });

  it("rejects transposed characters", () => {
    const ref = SomaReference.generate().value;
    const chars = [...ref];
    for (let i = 4; i < chars.length - 2; i++) {
      if (chars[i] !== chars[i + 1]) {
        [chars[i], chars[i + 1]] = [chars[i + 1]!, chars[i]!];
        expect(SomaReference.isValid(chars.join(""))).toBe(false);
        return;
      }
    }
  });

  it("rejects malformed input", () => {
    expect(() => SomaReference.parse("NOTSOMA123456")).toThrow(InvalidReferenceError);
    expect(() => SomaReference.parse("SOMA123")).toThrow(InvalidReferenceError);
    expect(SomaReference.isValid("")).toBe(false);
  });

  it("formats in readable groups", () => {
    expect(SomaReference.generate().format()).toMatch(
      /^SOMA-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{5}$/,
    );
  });
});
