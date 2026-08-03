# Soma — Claude Code Kickoff Prompt

Copy the block below into Claude Code at the root of an empty repo (with `CLAUDE.md` already placed there). It kicks off **M0 (Foundations)** and sets the rules for everything after. Milestone prompts M1–M5 follow at the bottom — run them one at a time, only after the previous milestone's tests pass.

---

## ▶️ Kickoff prompt (paste this first)

```
You are the lead engineer bootstrapping Soma, a school-payments + school-ERP platform
for African education. Before doing anything, read CLAUDE.md in full — it is the source
of truth for scope, architecture, domain language, and security guardrails. If any
instruction I give conflicts with CLAUDE.md, stop and flag it instead of guessing.

CONTEXT
- v1 = the FULL platform: Soma's own payment rail + school ERP + parent app (not a wedge).
- Because v1 moves money, the `payments` context is licensing-sensitive: keep it cleanly
  isolated and independently auditable, and support both partner/aggregator mode and
  direct mode behind one interface (see CLAUDE.md §2.1).
- Stack: TypeScript end-to-end — Next.js (web), NestJS (API), PostgreSQL + Prisma,
  BullMQ + Redis (workers), Zod (validation), pnpm workspaces monorepo.
- We are deliberately the opposite of the incumbent (SchoolPay): no MD5, no secrets in
  URLs, no PII before auth, at-least-once signed webhooks, strong tenant isolation.

YOUR TASK — MILESTONE M0 (FOUNDATIONS) ONLY. Do not build M1+ yet.
1. Scaffold the monorepo exactly per CLAUDE.md §6 (apps/web, apps/api, packages/core,
   packages/adapters, packages/db, packages/contracts, packages/config, workers/, infra/,
   docs/). Use pnpm workspaces. Add a root README and a docs/architecture.md stub.
2. Set up tooling: TypeScript strict everywhere, ESLint + Prettier, Vitest, Playwright,
   Husky pre-commit (lint + typecheck + test), GitHub Actions CI, and a docker-compose
   with Postgres + Redis for local dev.
3. In packages/core, implement the domain primitives: a `Money` value object (bigint minor
   units + ISO-4217 currency, no floats), typed domain errors, and the core entity types
   from CLAUDE.md §3 (School, SchoolGroup, Student, Guardian, Invoice, Payment,
   ReconciliationMatch, PaymentProvider, WebhookEvent, LedgerEntry).
4. In packages/db, create the Prisma schema for those entities with: tenant scoping by
   schoolId on every tenant-owned table, an APPEND-ONLY LedgerEntry table (no update/delete),
   money stored as BigInt minor units + currency, and an initial migration + seed script.
5. In apps/api (NestJS), stand up the `identity` bounded context: tenant + user models,
   email/OTP + password auth (Argon2id — never MD5), short-lived JWT sessions, RBAC roles
   (Owner, Bursar, Teacher, Viewer, Parent), and data-access guards that enforce tenant
   isolation on every query.
6. Apply the security baseline from CLAUDE.md §8 globally: security headers (CSP, HSTS,
   X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy), secrets
   via env only (commit a .env.example with dummy values), and structured request logging
   with PII redaction.
7. Define the `PaymentProviderAdapter` interface in packages/adapters (initiatePayment,
   checkStatus, verifyInboundSignature, parseWebhook) — interface + a NoopAdapter only.
   Do NOT implement real rails yet (that is M1).

DEFINITION OF DONE for M0
- `pnpm install && pnpm build && pnpm test` pass from a clean checkout.
- `docker compose up` gives a working Postgres + Redis; `pnpm db:migrate && pnpm db:seed` works.
- Tests prove: (a) tenant isolation — a user from School A cannot read School B's data;
  (b) LedgerEntry is append-only (update/delete rejected); (c) auth issues + verifies a
  session; (d) Money rejects float construction and cross-currency math.
- A short docs/adr/0001-stack-and-architecture.md records the key decisions.

CONSTRAINTS
- Work in small, reviewable commits (conventional commits). Open a PR-style summary at the end.
- Write tests alongside code; nothing is "done" without tests.
- Never commit secrets or real school credentials; use fixtures.
- If you hit an ambiguous decision, make the smallest reasonable choice, record it in an ADR,
  and note it in your summary — don't block.

Start by reading CLAUDE.md, then propose the file tree and the M0 commit plan before writing code.
```

---

## Follow-on milestone prompts (run one at a time, after the prior DoD is green)

**M1 — Payment rail (collections).**
```
Read CLAUDE.md §2.2 (M1), §5, §7 (F3–F6), and §8. Implement the `payments` bounded context:
MTN MoMo and Airtel Money adapters behind PaymentProviderAdapter (partner/aggregator mode
first, direct mode stubbed); payment-initiation (debit-prompt) + status inquiry; Soma payment
references; a two-step payer flow (code → confirm) with NO PII before auth; and OUTBOUND webhooks
that are HMAC-SHA256 signed, at-least-once with retries + exponential backoff, idempotency-keyed,
plus a replay/reconcile endpoint. Dedupe inbound provider callbacks by reference. Use sandbox/mock
provider credentials — no live money. DoD: end-to-end test of a simulated payment from initiation
→ callback → webhook delivery → ledger entry, including a forced-retry path. Keep the payments
context independently auditable.
```

**M2 — School ERP core + reconciliation engine.**
```
Read CLAUDE.md M2 and F7–F10. Build the `schools` context (SIS: students, classes/streams, terms,
enrolment, guardians) and invoicing (fee items, term invoices, outstanding balance, arrears aging),
then the reconciliation engine: auto-match Payment → Student → Invoice by payment code / reg number /
fuzzy name with a confidence score, a manual-review queue for low confidence, and a full audit trail.
Add bursar dashboards + CSV/Excel export. Reconciliation is the trust core — aim for the highest test
coverage in the codebase, including adversarial cases (duplicate receipts, ambiguous names, partial pays).
```

**M3 — Parent app.**
```
Read CLAUDE.md M3 / F11. Build the parent experience: multi-child, multi-school payment; saved payer
profiles; receipts; payment history; reminders across SMS/WhatsApp/email (opt-out, rate-limited, no PII
in URLs or logs). Web first, structured for a mobile client. Reuse the payments context; do not duplicate
money logic.
```

**M4 — Developer platform.**
```
Read CLAUDE.md M4 / F12. Expose a public REST API with a generated OpenAPI spec, a sandbox environment
with scoped API keys (in headers, never URLs), a TypeScript SDK, and in-portal webhook management with
delivery logs. DX is a core differentiator — the docs and sandbox must be genuinely good.
```

**M5 — Admissions, student wallet, financing hooks.**
```
Read CLAUDE.md M5 / F13–F15. Add online admissions/applications (OTP + reference tracking), a student
pocket-money wallet (deposits, withdrawals, bursar cashout, statements), and feature-flagged seams for
Phase-2 financing/savings. Wallet money flows reuse the payments context and the append-only ledger.
```

---

## How to use this well
- Keep `CLAUDE.md` at the repo root so every Claude Code session auto-loads it.
- Run milestones sequentially; don't let scope bleed forward.
- After each milestone, ask Claude Code to update `docs/architecture.md` and add an ADR for any notable decision.
- For any payments/auth change, require a "security implications" note in the summary (per CLAUDE.md §10).
