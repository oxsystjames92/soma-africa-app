import { describe, expect, it } from "vitest";
import { csvCell, formatMinor, toCsv } from "./csv.js";

describe("csvCell", () => {
  it("quotes cells containing separators or newlines", () => {
    expect(csvCell("St. Mary's, Kisubi")).toBe('"St. Mary\'s, Kisubi"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell('He said "hello"')).toBe('"He said ""hello"""');
  });

  it("neutralizes formula injection", () => {
    // A student name of =cmd|'/c calc'!A1 must not execute when the bursar
    // opens the export in Excel.
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("+1234567890")).toBe("'+1234567890");
    expect(csvCell("-1+1")).toBe("'-1+1");
    expect(csvCell("@SUM(A1:A9)")).toBe("'@SUM(A1:A9)");
    expect(csvCell("=cmd|'/c calc'!A1")).toContain("'=");
  });

  it("quotes a dangerous cell that also needs quoting", () => {
    expect(csvCell("=HYPERLINK(1,2)")).toBe('"\'=HYPERLINK(1,2)"');
  });

  it("renders empty values as empty strings", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell("")).toBe("");
  });

  it("renders bigints without precision loss", () => {
    expect(csvCell(9_007_199_254_740_993n)).toBe("9007199254740993");
  });

  it("leaves ordinary text untouched", () => {
    expect(csvCell("Amina Nakato")).toBe("Amina Nakato");
    expect(csvCell(42)).toBe("42");
  });
});

describe("toCsv", () => {
  it("writes CRLF-delimited rows with a header", () => {
    expect(toCsv(["a", "b"], [[1, 2], [3, 4]])).toBe("a,b\r\n1,2\r\n3,4");
  });

  it("writes just the header when there are no rows", () => {
    expect(toCsv(["a", "b"], [])).toBe("a,b");
  });
});

describe("formatMinor", () => {
  it("renders minor units as decimals without floating point", () => {
    expect(formatMinor(45_000_00n)).toBe("45000.00");
    expect(formatMinor(5n)).toBe("0.05");
    expect(formatMinor(0n)).toBe("0.00");
    expect(formatMinor(-1_50n)).toBe("-1.50");
  });

  it("stays exact far beyond Number.MAX_SAFE_INTEGER", () => {
    expect(formatMinor(9_007_199_254_740_993_00n)).toBe("9007199254740993.00");
  });

  it("supports zero-decimal currencies", () => {
    expect(formatMinor(1234n, 0)).toBe("1234");
  });
});
