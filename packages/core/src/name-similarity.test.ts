import { describe, expect, it } from "vitest";
import { compareNames, jaroWinkler, nameTokens, normalizeName } from "./name-similarity.js";

describe("normalizeName", () => {
  it("strips case, accents, and punctuation", () => {
    expect(normalizeName("  Améliá   O'Brien-Smith  ")).toBe("amelia o brien smith");
  });
});

describe("nameTokens", () => {
  it("drops honorifics that identify nobody", () => {
    expect(nameTokens("Mr. John Mukasa")).toEqual(["john", "mukasa"]);
    expect(nameTokens("DR Grace Nakimuli")).toEqual(["grace", "nakimuli"]);
  });
});

describe("jaroWinkler", () => {
  it("scores identical strings 1 and disjoint strings 0", () => {
    expect(jaroWinkler("mukasa", "mukasa")).toBe(1);
    expect(jaroWinkler("abc", "xyz")).toBe(0);
  });

  it("rewards a shared prefix", () => {
    // Same edit distance, but the second pair agrees at the start.
    expect(jaroWinkler("nakato", "nakuto")).toBeGreaterThan(jaroWinkler("nakato", "makato"));
  });

  it("handles empty input without dividing by zero", () => {
    expect(jaroWinkler("", "mukasa")).toBe(0);
    expect(jaroWinkler("", "")).toBe(1);
  });
});

describe("compareNames", () => {
  it("is order independent — the register and the SIM card disagree constantly", () => {
    expect(compareNames("Amina Nakato", "Nakato Amina")).toBe(1);
  });

  it("scores an exact match 1 regardless of spacing or case", () => {
    expect(compareNames("  AMINA   NAKATO ", "amina nakato")).toBe(1);
  });

  it("tolerates a middle name the payer omitted", () => {
    const score = compareNames("Amina Nakato", "Amina Grace Nakato");
    expect(score).toBeGreaterThan(0.9);
    expect(score).toBeLessThan(1);
  });

  it("tolerates a single typo", () => {
    expect(compareNames("Amina Nakato", "Amina Nakoto")).toBeGreaterThan(0.9);
  });

  it("separates genuinely different people", () => {
    expect(compareNames("Amina Nakato", "Joseph Okello")).toBeLessThan(0.6);
  });

  it("does not treat a shared surname as the same child", () => {
    // Siblings: same surname, different first name. Must not look like a match.
    expect(compareNames("Amina Nakato", "Joseph Nakato")).toBeLessThan(0.8);
  });

  it("returns 0 when either side has no usable tokens", () => {
    expect(compareNames("", "Amina Nakato")).toBe(0);
    expect(compareNames("Mr.", "Amina Nakato")).toBe(0);
    expect(compareNames("!!!", "Amina Nakato")).toBe(0);
  });

  it("is symmetric", () => {
    const pairs: [string, string][] = [
      ["Amina Nakato", "Nakato Amina Grace"],
      ["John Mukasa", "Jon Mukasa"],
      ["Grace", "Grace Nakimuli Sarah"],
    ];
    for (const [a, b] of pairs) {
      expect(compareNames(a, b)).toBeCloseTo(compareNames(b, a), 10);
    }
  });

  it("penalizes each extra unpaired token but caps the damage", () => {
    const one = compareNames("Amina", "Amina Nakato");
    const many = compareNames("Amina", "Amina Grace Sarah Nakato Namubiru");
    expect(one).toBeGreaterThan(many);
    // The cap keeps a long register entry from sinking a real match.
    expect(many).toBeGreaterThan(0.8);
  });
});
