/**
 * Name comparison for reconciliation.
 *
 * Ugandan school registers are messy in specific ways: name order varies
 * ("Nakato Amina" and "Amina Nakato" are one child), middle names appear and
 * vanish between the register and the mobile-money account, and transcription
 * swaps letters. This module handles those cases and nothing else — it makes
 * no decisions, it only scores.
 */

/** Honorifics that carry no identifying information. */
const TITLES = new Set(["mr", "mrs", "ms", "miss", "dr", "prof", "rev", "sr", "fr", "hon"]);

export function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9\s]/g, " ") // punctuation is noise
    .replace(/\s+/g, " ")
    .trim();
}

export function nameTokens(input: string): string[] {
  return normalizeName(input)
    .split(" ")
    .filter((token) => token.length > 0 && !TITLES.has(token));
}

/**
 * Jaro similarity: proportion of matching characters, discounted by how many
 * of those matches are out of order.
 */
function jaro(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatched = new Array<boolean>(a.length).fill(false);
  const bMatched = new Array<boolean>(b.length).fill(false);

  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - window);
    const end = Math.min(i + window + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatched[j] || a[i] !== b[j]) continue;
      aMatched[i] = true;
      bMatched[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const t = transpositions / 2;
  return (matches / a.length + matches / b.length + (matches - t) / matches) / 3;
}

/**
 * Jaro-Winkler: Jaro, biased toward strings that agree at the start.
 * Shared prefixes matter for names because typos cluster at the end.
 */
export function jaroWinkler(a: string, b: string): number {
  const base = jaro(a, b);
  if (base === 0) return 0;

  let prefix = 0;
  const limit = Math.min(4, a.length, b.length);
  while (prefix < limit && a[prefix] === b[prefix]) prefix++;

  return base + prefix * 0.1 * (1 - base);
}

/**
 * Compare two full names independent of token order.
 *
 * Each token of the shorter name is greedily paired with its best unused
 * partner in the longer name, so "Amina Nakato" and "Nakato Amina" score 1.
 * Unpaired tokens in the longer name are penalized only lightly — a register
 * holding a middle name the payer omitted is normal, not evidence of a
 * different child.
 */
export function compareNames(left: string, right: string): number {
  const a = nameTokens(left);
  const b = nameTokens(right);
  if (a.length === 0 || b.length === 0) return 0;

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  const used = new Array<boolean>(longer.length).fill(false);

  let total = 0;
  for (const token of shorter) {
    let bestScore = 0;
    let bestIndex = -1;
    for (let i = 0; i < longer.length; i++) {
      if (used[i]) continue;
      const score = jaroWinkler(token, longer[i]!);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    // An initial standing in for a full name is weak but not worthless.
    if (bestIndex >= 0) {
      used[bestIndex] = true;
      total += bestScore;
    }
  }

  const pairedAverage = total / shorter.length;
  // Every extra unpaired token costs 5%, capped so a long register name
  // cannot on its own sink an otherwise perfect match.
  const unpaired = longer.length - shorter.length;
  const penalty = Math.min(0.15, unpaired * 0.05);

  return Math.max(0, pairedAverage - penalty);
}
