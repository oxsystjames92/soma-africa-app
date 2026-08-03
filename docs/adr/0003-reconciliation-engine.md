# ADR-0003 — Reconciliation engine

- **Status:** accepted
- **Date:** 2026-06-03
- **Milestone:** M2

## Context

Reconciliation decides which child a parent's money belongs to. CLAUDE.md calls it
the product's trust core and asks for the highest test coverage in the codebase.

The failure that matters is not "we failed to match" — a bursar fixes that in a
minute. It is **"we matched confidently and wrongly"**: one family's fees credited
to another child, discovered weeks later during a fee dispute, if ever. Every
decision below is chosen to make that outcome hard to reach.

## Decisions

**The matcher is a pure function.** `matchPayment` in `@soma/core` takes a payment
signal and a candidate list and returns a decision. No database, no clock, no
randomness. That is what lets the adversarial cases be enumerated in unit tests,
and what makes the audit trail meaningful: the same inputs always produce the same
decision, so a stored decision can be re-derived and defended years later.

**Ambiguity is checked before confidence.** If the runner-up scores within 0.05 of
the leader, the payment goes to review — even when both score 1.00. Two children
named John Mukasa must never be told apart by which row the database returned
first. Checking confidence first would auto-confirm a perfect tie.

**Names alone can never auto-confirm.** Fuzzy name confidence is capped at 0.92,
below the 0.95 auto-confirm threshold. A perfect string match on a common name is
still a guess about a person. Names route to a human, always.

**Embedded-code confidence scales with length.** A code found inside free-text
narration scores 0.96 at 8+ characters and 0.85 below that, because length governs
the odds of a coincidental substring. A full 10-digit code appearing by chance is
negligible; a 5-character one is not. Identifiers under 5 characters are ignored
entirely.

**Money moves only on CONFIRMED matches.** A PROPOSED match records the engine's
opinion and allocates nothing. Invoices change only when the engine auto-confirms
or a bursar accepts. This makes the review queue genuinely safe: a wrong proposal
costs a click, not a correction.

**Allocation clears the oldest invoice first.** Ties break on invoice id, so a plan
is deterministic. Oldest-first is a decision about families, not just accounting:
it stops a child accruing arrears on a term the parent has in fact partly paid.

**Partial payment is a normal outcome.** Parents pay in instalments. A short
payment settles what it can and leaves the invoice open; an overpayment leaves
credit rather than inventing an invoice to absorb it.

**Re-running the engine is a no-op.** A payment with any PROPOSED or CONFIRMED
match is skipped, so the engine can be run over a whole term safely and a duplicate
receipt cannot be allocated twice.

**The audit trail is append-only, enforced by the same trigger as the ledger.**
Every proposal, confirmation, rejection, and failure to match is recorded with its
confidence, strategy, evidence, and runner-up. Rows survive deletion of the payment
they describe — the dispute answer must outlive the records it refers to.

## Decisions made under ambiguity

**Payment signals are thin in M2.** The engine currently reads the Soma reference
and receipt number. Rails do carry payer names and free-text narration, but M1
does not yet persist them on `Payment`. The matcher already accepts `payerName`
and `narration`, so widening the signal is a data-capture change, not a redesign.
Recorded as the first thing to close in M3.

**Fuzzy matching penalizes unpaired name tokens at 5% each, capped at 15%.** Tuned
against the realistic cases — a register holding a middle name the payer omitted
should still match; a bare surname shared by siblings should not. These constants
are the most likely thing to need adjusting against real school data, and they sit
in one file for that reason.

**CSV, not XLSX.** "Excel export" is satisfied by CSV, which Excel opens natively
and which cannot carry a macro. A real `.xlsx` writer adds a dependency and an
attack surface for no gain a bursar would notice.

**Formula injection is neutralized by prefixing a single quote.** Cells beginning
with `=`, `+`, `-`, `@`, tab, or carriage return execute when opened in Excel or
Sheets. A student name is attacker-influenced data in a system that lets schools
import rosters, so exports sanitize on write.

## Consequences

- The engine is safe to run repeatedly and in bulk, which is what makes a nightly
  sweep viable in M3.
- The review queue is the throttle on wrong matches, so its size is an operational
  metric: a growing queue means the matcher is too timid or the signal is too thin.
- Auto-confirm currently requires a structured identifier. Schools that do not
  issue payment codes will see everything route to review until M3 widens the
  signal.
- Tuning thresholds changes historical comparability. Any change should be recorded
  as a new ADR, since the audit trail's stored confidences were produced under the
  old constants.
