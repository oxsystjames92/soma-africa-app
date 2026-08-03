import { compareNames, normalizeName } from "./name-similarity.js";

/**
 * The reconciliation matcher: given what a payment tells us and the students
 * it could belong to, decide who it belongs to and how sure we are.
 *
 * Pure by design. No database, no clock, no randomness — every decision here
 * is reproducible from its inputs, which is what makes an audit trail worth
 * anything and lets the adversarial cases be tested exhaustively.
 */

export type MatchStrategy =
  | "payment_code"
  | "reg_number"
  | "code_in_narration"
  | "fuzzy_name";

/** Confidence at or above this is safe to apply without a human. */
export const AUTO_CONFIRM_THRESHOLD = 0.95;
/** Below this we do not even propose a match; the payment stays unmatched. */
export const REVIEW_THRESHOLD = 0.7;
/**
 * If the runner-up is this close to the leader, the evidence does not
 * distinguish them. Two children named John Mukasa must never be told apart
 * by a coin flip, however confident each score looks on its own.
 */
export const AMBIGUITY_MARGIN = 0.05;

export interface StudentCandidate {
  studentId: string;
  /** School-assigned payment code. */
  paymentCode?: string | null;
  /** Registration number, distinct from the payment code. */
  regNumber?: string | null;
  fullName: string;
}

export interface PaymentSignal {
  /** Structured code supplied by the payer, when the rail captured one. */
  paymentCode?: string | null;
  /** Free text from the rail: narration, reference, or payer message. */
  narration?: string | null;
  /** Name on the paying mobile-money account. */
  payerName?: string | null;
}

export interface CandidateScore {
  studentId: string;
  confidence: number;
  strategy: MatchStrategy;
  /** Human-readable justification, stored on the audit record. */
  evidence: string;
}

export type MatchOutcome =
  | { decision: "auto"; best: CandidateScore; runnerUp?: CandidateScore }
  | { decision: "review"; best: CandidateScore; runnerUp?: CandidateScore; reason: string }
  | { decision: "unmatched"; reason: string; ranked: CandidateScore[] };

/** Identifiers compare only after case and separators are stripped. */
function normalizeCode(value: string): string {
  return value.toUpperCase().replace(/[\s\-/]/g, "");
}

function scoreCandidate(
  signal: PaymentSignal,
  candidate: StudentCandidate,
): CandidateScore | null {
  const code = signal.paymentCode ? normalizeCode(signal.paymentCode) : null;
  const narration = signal.narration ?? "";

  // 1. The payer supplied the school's payment code and it matches exactly.
  if (code && candidate.paymentCode && normalizeCode(candidate.paymentCode) === code) {
    return {
      studentId: candidate.studentId,
      confidence: 1,
      strategy: "payment_code",
      evidence: `Payment code ${candidate.paymentCode} matched exactly`,
    };
  }

  // 2. The supplied code is actually the registration number.
  if (code && candidate.regNumber && normalizeCode(candidate.regNumber) === code) {
    return {
      studentId: candidate.studentId,
      confidence: 0.97,
      strategy: "reg_number",
      evidence: `Registration number ${candidate.regNumber} matched exactly`,
    };
  }

  // 3. An identifier is embedded in free text: "fees for 1009876543".
  //    Confidence scales with length, because that is what governs the odds
  //    of a coincidental substring. A full 10-digit code appearing by chance
  //    is negligible; a 5-character one is not.
  const haystack = normalizeCode(narration);
  for (const [identifier, label] of [
    [candidate.paymentCode, "Payment code"],
    [candidate.regNumber, "Registration number"],
  ] as const) {
    if (!identifier) continue;
    const normalized = normalizeCode(identifier);
    if (normalized.length < 5 || !haystack.includes(normalized)) continue;

    return {
      studentId: candidate.studentId,
      confidence: normalized.length >= 8 ? 0.96 : 0.85,
      strategy: "code_in_narration",
      evidence: `${label} ${identifier} found in "${narration.trim()}"`,
    };
  }

  // 4. Nothing structured left. Fall back to the names, which are the weakest
  //    evidence we accept and never enough to auto-confirm on their own.
  const sources = [signal.payerName, narration].filter(
    (value): value is string => !!value && normalizeName(value).length > 0,
  );
  if (sources.length === 0) return null;

  let best = 0;
  let bestSource = "";
  for (const source of sources) {
    const score = compareNames(source, candidate.fullName);
    if (score > best) {
      best = score;
      bestSource = source;
    }
  }
  if (best === 0) return null;

  return {
    studentId: candidate.studentId,
    // Names alone are capped below the auto-confirm threshold. A perfect
    // string match on a common name is still a guess about a person.
    confidence: Math.min(best, 0.92),
    strategy: "fuzzy_name",
    evidence: `Name "${bestSource.trim()}" resembles "${candidate.fullName}" (${best.toFixed(2)})`,
  };
}

/**
 * Rank candidates and decide what to do.
 *
 * The order of checks matters: ambiguity is tested BEFORE confidence, so a
 * tie between two strong candidates goes to a human rather than to whichever
 * one the database happened to return first.
 */
export function matchPayment(
  signal: PaymentSignal,
  candidates: readonly StudentCandidate[],
): MatchOutcome {
  const ranked = candidates
    .map((candidate) => scoreCandidate(signal, candidate))
    .filter((score): score is CandidateScore => score !== null)
    .sort((a, b) => b.confidence - a.confidence || a.studentId.localeCompare(b.studentId));

  if (ranked.length === 0) {
    return {
      decision: "unmatched",
      reason: "No student matched any identifier or name on this payment",
      ranked: [],
    };
  }

  const best = ranked[0]!;
  const runnerUp = ranked[1];

  if (best.confidence < REVIEW_THRESHOLD) {
    return {
      decision: "unmatched",
      reason: `Best candidate scored ${best.confidence.toFixed(2)}, below the ${REVIEW_THRESHOLD} review threshold`,
      ranked,
    };
  }

  if (runnerUp && best.confidence - runnerUp.confidence <= AMBIGUITY_MARGIN) {
    return {
      decision: "review",
      best,
      runnerUp,
      reason: `Ambiguous: ${ranked.filter((r) => best.confidence - r.confidence <= AMBIGUITY_MARGIN).length} students scored within ${AMBIGUITY_MARGIN} of each other`,
    };
  }

  if (best.confidence >= AUTO_CONFIRM_THRESHOLD) {
    return runnerUp ? { decision: "auto", best, runnerUp } : { decision: "auto", best };
  }

  return {
    decision: "review",
    best,
    ...(runnerUp ? { runnerUp } : {}),
    reason: `Confidence ${best.confidence.toFixed(2)} is below the ${AUTO_CONFIRM_THRESHOLD} auto-confirm threshold`,
  };
}
