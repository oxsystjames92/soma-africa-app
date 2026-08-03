# ADR-0004 — Parent identity and the parent app

- **Status:** accepted
- **Date:** 2026-06-03
- **Milestone:** M3

## Context

M3 asks for multi-child, **multi-school** payment (CLAUDE.md §7 F11). That single
word breaks an assumption holding since M0: every identity in Soma is bound to one
school, and every query is scoped by `schoolId` taken from the session.

A parent is genuinely not tenant-scoped. A mother with one child at a Kampala
primary and another at an Entebbe secondary is one person with one phone, and
asking her to hold two logins would be a worse product than the incumbent.

## Decisions

**Parent identity is a separate model that deliberately crosses tenants.**
`GuardianIdentity` is keyed by phone and unique platform-wide. The existing
school-scoped `Guardian` records each point at it, so tenant isolation is untouched
for staff and for school data.

**The identity grants nothing on its own.** This is what contains the blast radius.
A parent session carries only an identity id — no `schoolId`, no role. Every read
resolves access by walking `Guardian → GuardianStudent → Student`, so a parent
reaches exactly the students explicitly linked to them and never a school. Losing a
parent token exposes that parent's children; it cannot expose a tenant.

**Parent sessions use a distinct JWT audience.** Staff and parent tokens share a
signing secret, so without an audience claim a parent token would satisfy the staff
guard's signature check. `soma:parent` is what makes the two token families
non-interchangeable, and `GuardianGuard` is a separate class from `AuthGuard` so
neither can be applied by accident.

**Identities are minted, never self-registered.** `requestOtp` creates an identity
only for a phone a school has already registered as a guardian. Self-registration
would let anyone claim to be a parent and then wait to be linked.

**Login is phone plus a one-time code.** Parents have no password and often no
email. Codes are single-use, expire in five minutes, and lock after five wrong
attempts so a six-digit space cannot be walked. Requesting a code for an unknown
number returns the same 202 as a known one.

**Not-yours and does-not-exist return the same error.** Distinguishing them would
let a parent probe which children are enrolled at a school.

**The parent app adds no money logic.** `ParentService.pay` proves linkage and
delegates to `PaymentsService.payForStudent`, which shares one private routine with
the anonymous two-step flow. There remains exactly one place in the system that
creates a `Payment` and calls a rail.

**Reminder rate limits count per person, not per channel or per child.** Being
messaged is a per-person experience; a parent with four children at two schools
must not receive four times the messages. Suppressed attempts do not consume the
allowance — otherwise a rate-limited parent could never be reached again.

**Suppressions are logged as carefully as sends.** Proving a parent was *not*
messaged after opting out is the point of the log. Bodies, phone numbers, and child
names are never written to it.

**Reminder timestamps come from the service clock, not the database.** The
rate-limit window is computed from the same clock; a limit measured against
timestamps the service never saw is not a limit. This surfaced as a failing test
and was fixed in the service rather than in the test.

## Decisions made under ambiguity

**Email reminders are off by default; SMS and WhatsApp are on.** Schools rarely
hold a verified parent email, and messaging an unverified address is a disclosure
risk — the recipient may not be the parent. Phone numbers are the identifier the
school actually verified.

**Parent sessions live four times longer than staff sessions.** A bursar works in
sustained sittings; a parent opens the app three times a term. Being logged out
mid-payment is the failure mode to avoid. Still short-lived in absolute terms.

**Saved payer numbers are capped at five.** Arbitrary, but unbounded rows keyed by
an unauthenticated-adjacent identity is a growth vector. Five covers both parents
and a relative who helps.

**The web app is one API consumer, not a privileged one.** Every screen calls the
same REST surface a native client will, with the token in an `Authorization`
header. Nothing is server-rendered with privileged access, so the mobile client in
the backlog needs no new endpoints.

## Consequences

- Tenant isolation is now a two-shape rule: staff are scoped by `schoolId`, parents
  by student linkage. Any future endpoint must pick one deliberately; a route
  guarded by neither is a bug.
- A parent's phone number is their login handle, so a number changing hands is an
  account-recovery problem. Schools can already re-point a `Guardian` record, but
  there is no flow for revoking an identity's claim — worth building before scale.
- Reminder delivery is still a logging stub. Real SMS and WhatsApp need provider
  credentials and, for WhatsApp, Meta template approval — both external
  dependencies, so the channel interface is in place and the adapters are not.
- The web parent app covers login, children, and history. Receipts, saved payers,
  and reminder preferences exist as tested API surface without screens yet.
