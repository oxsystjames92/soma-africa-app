# ADR-0001 — Stack and architecture

- **Status:** accepted
- **Date:** 2026-06-03
- **Milestone:** M0

## Context

Soma is a school-payments and school-ERP platform for African education, competing
with incumbents (SchoolPay, Urubuto) on security, reconciliation reliability,
developer experience, and UX. v1 is the full platform and moves money, so the
`payments` context is licensing-sensitive and must be independently auditable.

## Decisions

**Modular monolith, not microservices.** One deployable, organized into bounded
contexts (`identity`, `schools`, `payments`, `reconciliation`, `notifications`,
`developer`, `wallet`). Splitting is deferred until a context demonstrably needs
independent scaling — likely `payments` in Phase 2. Microservices-first would buy
operational cost we cannot yet justify.

**TypeScript end-to-end** (Next.js web, NestJS API, Prisma/PostgreSQL, BullMQ/Redis,
Zod). One language across the stack; NestJS modules map cleanly onto bounded contexts.

**Money is `bigint` minor units + ISO-4217 currency, never floats.** The `Money`
value object rejects float construction outright and throws on cross-currency
arithmetic rather than silently coercing.

**The ledger is append-only, enforced twice.** A PostgreSQL trigger rejects
`UPDATE`/`DELETE`/`TRUNCATE` on `LedgerEntry`, and a Prisma client extension rejects
the same operations before they reach the database. The trigger is authoritative —
the client guard exists to fail fast with a typed domain error. Corrections are new
entries, never edits.

**Tenant isolation lives in the data-access layer.** `tenantScoped(client, schoolId)`
AND-s `schoolId` into every `where` and forces it onto every `create`, so a caller
cannot read or plant rows in another school even by passing an explicit `schoolId`.
Cross-tenant rows are invisible (null/empty) rather than forbidden, which avoids
leaking existence.

**Auth: Argon2id + short-lived HS256 JWTs, bearer tokens in headers only.** MD5 is
banned (§8.3) and secrets never appear in URLs (§8.2). Authentication failures are
uniform: an unknown account, a wrong password, and a right password against the wrong
tenant are indistinguishable to the caller, and OTP requests for unknown accounts
return the same 202 as real ones.

**One `PaymentProviderAdapter` interface for every rail**, covering both
partner/aggregator mode (settling through a licensed third party) and direct mode
(Soma's own licence). The mode is adapter configuration, invisible to callers, so a
licence change is not a code change. M0 ships the interface and a `NoopAdapter` only.

## Decisions made under ambiguity (smallest reasonable choice)

- **Fresh repository at `~/soma`.** The kickoff prompt assumed an empty repo, but
  `CLAUDE.md` sat inside the previous waitlist app. That app is live and unrelated in
  shape, so it was archived (`~/archive/soma-africa-app`, tag `archive/waitlist-phase1`)
  rather than reshaped into a monorepo. It may return as an add-on later.
- **Postgres on host port 5434.** 5432 and 5433 were already taken on the development
  machine by other local databases.
- **`GuardianStudent` join table.** CLAUDE.md describes a Guardian linked to "one or
  more Students"; a many-to-many join models that without assuming a single school.
- **`Payment` is unique on `(schoolId, providerRef)`.** Inbound idempotency needs a
  natural key from M0, before M1's dedupe logic exists.
- **OTP delivery is a logging stub** with the code redacted. Real SMS/email delivery
  belongs to the notifications context (M3).

## Consequences

- Every new rail is an adapter; no provider is special-cased elsewhere in the codebase.
- The append-only ledger means storage grows monotonically — acceptable and required
  for audit; archival strategy is a Phase-2 concern.
- Tenant scoping must be applied at every entry point. The guard populates
  `req.session.schoolId`, and data access derives scope from it rather than from
  request input.
