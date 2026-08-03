/**
 * CSV writing for bursar exports (CLAUDE.md §7 F10).
 *
 * Two hazards are handled here. RFC 4180 quoting, so a school name containing
 * a comma does not shift every column. And formula injection: Excel and Sheets
 * execute a cell beginning with = + - @ or a control character, which turns a
 * student name field into code execution on the bursar's machine. Prefixing
 * with a single quote neutralizes it while displaying the original text.
 */

const NEEDS_QUOTING = /[",\r\n]/;
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  let text = typeof value === "bigint" ? value.toString() : String(value);
  if (FORMULA_TRIGGER.test(text)) text = `'${text}`;
  if (NEEDS_QUOTING.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function csvRow(cells: readonly unknown[]): string {
  return cells.map(csvCell).join(",");
}

export function toCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return [csvRow(headers), ...rows.map(csvRow)].join("\r\n");
}

/** Minor units to a decimal string Excel reads as a number, without floats. */
export function formatMinor(minorUnits: bigint, decimals = 2): string {
  const negative = minorUnits < 0n;
  const digits = (negative ? -minorUnits : minorUnits).toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = decimals > 0 ? `.${digits.slice(digits.length - decimals)}` : "";
  return `${negative ? "-" : ""}${whole}${fraction}`;
}
