# ADR-0006 — Pocket-money wallets, admissions, and Phase-2 seams

- **Status:** accepted
- **Date:** 2026-06-03
- **Milestone:** M5

## Context

M5 completes v1 (CLAUDE.md §7 F13–F15): online admissions, a student pocket-money
wallet, and feature-flagged seams for Phase-2 financing and savings.

Two new risks arrive. A wallet is **a child's own money**, held by the school, moved
by staff — a different trust relationship from fees. And admissions is a second
unauthenticated public surface, filed by people who may never hold a Soma account.

## Decisions

### Wallets

**One private routine changes a balance, and it uses a conditional update.**
`move()` reads the balance, computes the next one, then updates `WHERE id = ? AND
balanceMinor = <the value it read>`. If another transaction moved first, zero rows
match and the attempt is rejected rather than applied to stale state.

This is the decision that matters. A read-then-write implementation lets two
concurrent withdrawals both observe a sufficient balance and both commit,
overdrawing a child. A test fires ten simultaneous withdrawals of the entire
balance and asserts exactly one succeeds and the balance lands at zero.

**Amounts are stored unsigned; direction lives in `type`.** A sign error cannot
silently invert a withdrawal into a deposit — the worst kind of money bug, because
it looks like generosity rather than corruption.

**`balanceMinor` is a cached projection, and `balanceAfterMinor` is recorded per
entry.** A statement can be audited line by line without replaying every prior row,
and a test replays the entries to confirm the cache agrees with its own history.

**Every wallet movement writes a `LedgerEntry` too.** The wallet's statement and the
school's books record the same fact independently, both append-only. They can be
reconciled against each other, and neither can be quietly rewritten to make them
agree.

**Insufficient-funds errors omit the balance.** The message would otherwise tell a
caller probing limits exactly how much is there.

### Admissions

**Possession of the reference *and* the phone is the credential.** An applicant has
no account. The reference carries 40 bits of entropy over a Crockford-style alphabet
with no characters that are confusable when read aloud over a phone.

**A wrong reference and a wrong phone are both answered with silence.** Requesting a
code always resolves. Returning an error for an unknown reference would turn the
endpoint into an oracle for discovering valid ones.

**Status transitions are validated against an explicit table.** Anything not listed
is refused, so a rejected applicant cannot be quietly resurrected and an application
cannot jump from submitted to accepted without an offer in between.

**Enrolment is a separate act from acceptance.** Accepting an application does not
create a student. A roster changing as a side effect of an admissions click is the
kind of surprise that erodes trust in the register.

**`ApplicationEvent` is append-only.** An admissions decision is exactly the kind of
thing a family later disputes.

### Phase-2 seams

**Two locks, deliberately.** The feature flag is the operational switch; behind it,
the seam refuses unless a licensed partner is supplied — and none ships in v1. A
flag flipped by accident, in a config sweep or by someone testing, must not be able
to start offering credit to families. Financing and savings are regulated products
(§2.1); enabling them should accompany a partner agreement, never a config tidy-up.

## Decisions made under ambiguity

**Wallet deposits are staff-initiated in v1.** The service accepts a `paymentId` so
a rail deposit ties back to its transaction, but no automatic rail-to-wallet route
ships. Routing a parent's mobile-money payment to pocket money rather than fees is a
product decision about defaults that should be made with a real school.

**No transfer between wallets.** Student-to-student transfers invite a payments
system inside the school we have not thought through — bullying, coercion, and an
audit surface nobody asked for.

**Wallet entries make their student undeletable.** Append-only cascades: deleting a
student would have to delete their wallet entries, which the database refuses. This
is correct — a child's money history should outlive their enrolment — but it means
test fixtures isolate rather than clean up, and a real deletion request under data
protection law will need a documented anonymisation path rather than a delete.

**Cashout records the bursar, not a signature.** Physical cash handover is
ultimately a paper trust exercise; the record says who logged it and when, which is
what makes a discrepancy traceable to a person.

## Consequences

- The enforced-immutable tables are now four: `LedgerEntry`, `ReconciliationAudit`,
  `WalletEntry`, `ApplicationEvent`. Any table holding a disputable fact should join
  them.
- Wallet float is real money a school holds on behalf of children. Aggregate wallet
  balances need a reconciliation report against the bank before a school runs this
  at scale — it is a liability, not revenue.
- The admissions applicant surface is public and unauthenticated. Its rate limiter
  is in-memory, so it needs Redis before a second API replica, like the payment-code
  lookup.
