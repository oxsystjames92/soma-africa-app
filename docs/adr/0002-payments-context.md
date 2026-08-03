# ADR-0002 — Payments context

- **Status:** accepted
- **Date:** 2026-06-03
- **Milestone:** M1

## Context

M1 makes Soma move money: mobile money collections over MTN and Airtel, with
outbound event delivery to schools. Because v1 moves money, the `payments`
context is licensing-sensitive (CLAUDE.md §2.1) and must be auditable on its own.
Every decision below is written against the incumbent's failure modes.

## Decisions

**Direct mode throws on construction.** Both rail adapters accept a `mode` of
`partner` or `direct`, but `direct` raises immediately. Soma does not hold a PSP
licence, and a config flag must never be the only thing standing between us and
unlicensed money movement. Turning it on requires deleting the guard — a code
change, a review, and a deliberate act.

**A partially configured rail is not registered.** The module builds an adapter
only when every credential is present. A rail constructed with blank secrets would
fail at the worst possible moment: mid-payment.

**Unrecognized provider statuses map to `unknown`, never success.** Rails add
status codes without warning. Defaulting an unknown code to "succeeded" would
credit a school for money that never arrived.

**Signatures are verified over the raw request bytes.** Nest is configured with
`rawBody: true` and the callback controller checks the signature before parsing.
Verifying a re-serialized object would authenticate different bytes than the ones
we act on — key ordering and whitespace differ, and that gap is exploitable.

**Inbound callbacks dedupe on `(provider, eventId)`.** The dedupe row is inserted
inside the same transaction that applies the payment, so a rail retrying a callback
trips a unique constraint and the whole apply is a no-op. Rails retry aggressively;
double-crediting a school is unrecoverable trust damage.

**Outbound webhooks use a transactional outbox rather than a queue.** The delivery
row is written in the same transaction as the payment and its ledger entry. A queue
enqueue after commit has a window where money is recorded and the notification is
lost; the outbox closes it. BullMQ schedules the drain but is not the source of
truth, so a Redis outage delays delivery instead of losing events.

**Signatures bind a timestamp: `HMAC-SHA256(secret, "{t}.{body}")`, sent as
`Soma-Signature: t=…,v1=…`.** Receivers reject anything older than five minutes.
Signing the body alone would let an attacker replay a captured valid delivery
forever.

**Backoff is exponential with full jitter**, eight attempts from 5s to a 6-hour
cap. Without jitter, every delivery queued during a receiver outage retries in
lockstep and stampedes it the moment it recovers.

**Idempotency keys are stable across retries.** A receiver that processed a
delivery whose response we never saw can discard the duplicate.

**Polled reconciliation reuses the callback path.** `refreshStatus` synthesizes the
provider's own payload and feeds it through `handleCallback`, so a polled result and
a pushed one produce byte-identical records — including the ledger entry and the
outbound event. Two code paths writing money two ways is how ledgers drift.

## Decisions made under ambiguity

**The confirmation step shows the payer nothing about the student.** This is the
sharpest trade-off in M1. Every competitor reassures the payer with "paying for
Amina Nakato, P5, balance UGX 450,000", but §8.1 forbids returning a student's name,
school, *or* balance before authentication — the incumbent leaked exactly this from an
unauthenticated endpoint. So step 1 returns validity and an opaque token, nothing more.

The cost is real: a payer who mistypes a code that happens to belong to another
student gets no chance to notice before paying. Mitigations shipped: the payment code
is echoed in the debit prompt narration on the payer's own phone, and the Soma
reference carries a check character so a mistyped *reference* cannot resolve at all.
Revisit in M3, when an authenticated parent app can safely show child details.

**The rate limiter is in-memory.** The unauthenticated lookup is an oracle for
enumerating payment codes, so it needs a limit now; a per-instance limit is worth
more than none. It must move to Redis before a second API replica runs, and this is
recorded as a known limitation rather than a finished piece of work.

**Bank settlement (F6) ships as an interface plus an in-memory implementation.**
Settlement is pull-based and batch-oriented, so it gets its own interface rather than
being forced through `PaymentProviderAdapter`. Real bank integration needs a
counterparty and credentials we do not yet have; the `Settlement` table and adapter
seam are in place so reconciliation in M2 has something to match against.

**Amounts cross the API boundary as strings.** JSON numbers cannot hold large
bigints exactly, and a silently rounded fee is exactly the class of bug the `Money`
value object exists to prevent.

## Consequences

- The payments context can be audited by reading `apps/api/src/payments`,
  `packages/adapters`, and the payments tables. It reaches into no other context.
- An event is delivered at least once, never at most once, and may arrive more than
  once — receivers must dedupe on `Soma-Idempotency-Key`. This is documented for
  integrators in M4.
- Dead deliveries accumulate until replayed by hand. An alert on `status = DEAD` is
  needed before the first school goes live.
- Adding a rail means implementing `PaymentProviderAdapter` and adding credentials.
  No other file changes.
