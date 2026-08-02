# CLAUDE.md — Soma Platform

> This file guides Claude Code when working in the Soma repository. Read it fully before writing code. It defines **what we are building, why, the architecture, and the guardrails**. When a request conflicts with this document, surface the conflict rather than silently diverging.

---

## 1. What Soma Is (North Star)

Soma is a **school-payments and school-operations platform for African education**, built to be the modern, secure, developer-first alternative to incumbents like SchoolPay (Uganda) and Urubuto (Rwanda).

**One-line mission:** *Make school fee collection, reconciliation, and school operations effortless, transparent, and trustworthy for schools, parents, and banks.*

We compete on four things incumbents demonstrably lack (from a first-hand teardown of SchoolPay's public surface):

1. **Security & data privacy** — no PII exposed before authentication; strong API auth; minors' data protected by design.
2. **Reconciliation reliability** — guaranteed, auditable payment reconciliation (at-least-once delivery, idempotency).
3. **Developer experience** — an API-first platform with a real sandbox, OpenAPI spec, SDKs, and signed/retried webhooks.
4. **Modern UX** — a two-step payment flow, saved payer profiles, and mobile-first design.

> Anti-goal: **do not** rebuild a 2015-era PHP monolith with MD5 auth, secrets-in-URL, and single-attempt webhooks. Every decision should be the opposite of those mistakes.

---

## 2. Product Scope & Phasing

**v1 is the full platform: Soma's own payment rail + school ERP + parent app.** This is the complete SchoolPay competitor, not a wedge. Because v1 moves money, **PSP/PSO licensing is on the critical path** — see Section 2.1. Build v1 as a sequence of milestones (M0→M5), each shippable and independently testable, but all in scope for v1.

### 2.1 Regulatory reality (read before writing payment code)
Moving money requires a **payment licence** in each market (Bank of Uganda PSP/PSO; BNR PSP Reg 74/2023 in Rwanda; BRB in Burundi; NBE in Ethiopia). Engineering implications:
- Isolate all money-movement in the `payments` bounded context so it can be certified/audited independently and, if needed, run under a licensed partner's rails while our own licence is pending.
- Support a **partner/aggregator mode** (settle through a licensed bank/aggregator) and a **direct mode** (our own licence) behind the same interface — do not assume we hold the licence on day one.
- Assume PCI-adjacent scrutiny, full audit trails, and reconciliation guarantees from the first line of payment code.

### 2.2 v1 milestones (all in scope)

**M0 — Foundations:** monorepo, tenant/auth, domain model, append-only ledger, security baseline (Section 8), CI/CD, observability.

**M1 — Payment rail (collections):** the `payments` context. Pluggable rail adapters (MTN MoMo, Airtel Money first), payment-initiation flow (debit-prompt/STK), Soma payment references, status inquiry, and **signed + retried (at-least-once) webhooks** with idempotency. Two-step payer UX. Bank-settlement adapter.

**M2 — School ERP core:** Student Information System (students, classes/streams, terms, enrolment), invoicing & fee structures, and the **reconciliation engine** matching payments → students → invoices. Bursar dashboards, arrears aging, reporting/BI, exports.

**M3 — Parent app:** multi-child, multi-school fee payment, saved payer profiles, receipts, payment history, reminders; web + mobile.

**M4 — Developer platform:** public API, OpenAPI spec, sandbox keys, SDKs, in-portal webhook management — DX as a first-class differentiator.

**M5 — Admissions, student wallet, financing hooks:** online admissions/applications, student pocket-money wallet (deposits/withdrawals/bursar cashout), and clean seams for Phase-2 financing/savings.

### Phase 2 (post-v1) — Financing & Savings
Fee installments/BNPL and fees-savings products layered on transaction data, delivered with licensed lending/savings partners. Build behind feature flags; leave seams in M5.

**Rule for Claude Code:** build v1 milestones in order (M0→M5); do not start a milestone until the previous one has tests and passes. Every external rail (mobile money, bank) is an *adapter* behind a common interface — never hard-code a single provider. A SchoolPay ingestion adapter may still be built to import legacy data when a school migrates to us, but Soma runs its **own** rail — SchoolPay is not a runtime dependency.

---

## 3. Domain Model (Ubiquitous Language)

Use these terms consistently in code, DB, and APIs.

| Entity | Meaning | Key fields |
|---|---|---|
| **School** (tenant) | A paying customer institution | id, name, country, currency, timezone, status |
| **SchoolGroup** | Optional parent org (chain, diocese) owning many Schools | id, name |
| **Student** | A learner at a School | id, schoolId, externalRef (e.g. SchoolPay payment code), name, class, status |
| **Guardian** | Parent/payer linked to one or more Students | id, name, phone, email, locale |
| **Invoice** | An amount owed by a Student for a term/item | id, studentId, term, amountDue, currency, dueDate, status |
| **Payment** | A money-in event reconciled to a Student/Invoice | id, schoolId, studentId?, amount, currency, channel, providerRef, receiptNo, paidAt, status |
| **ReconciliationMatch** | Link between a Payment and Invoice(s) with confidence | id, paymentId, invoiceId, method(auto/manual), confidence |
| **PaymentProvider** | Source/rail of a Payment (SchoolPay, MTN, Airtel, Soma-rail) | id, type, config |
| **WebhookEvent** | Inbound or outbound event with delivery state | id, type, payload, signature, attempts, status |
| **LedgerEntry** | Immutable, append-only record of every financial fact | id, schoolId, type, amount, currency, refs, createdAt |

**Non-negotiables:**
- The **ledger is append-only**. Corrections are new entries, never edits/deletes.
- All money is stored as **integer minor units** (e.g. cents) + an ISO-4217 `currency` — never floats.
- Every `Student` and `Payment` is **tenant-scoped** by `schoolId`; multi-tenancy isolation is enforced at the data-access layer.

---

## 4. System Architecture

**Style:** modular monolith (single deployable) organized into **bounded contexts**, with async workers for ingestion/reconciliation/notifications. Split into microservices only when a context demonstrably needs independent scaling (likely `payments` in Phase 2). Do not start microservices-first.

```
                    ┌──────────────────────────────┐
   Parents/Bursars  │   Web app (Next.js)          │
   ───────────────► │   - School dashboard         │
                    │   - Reconciliation UI        │
                    │   - Arrears & reminders       │
                    └──────────────┬───────────────┘
                                   │ REST/tRPC (authenticated)
                    ┌──────────────▼───────────────┐
                    │   API (NestJS)               │
                    │   Bounded contexts:          │
                    │   • identity (auth, tenants) │
                    │   • schools (SIS-lite)       │
                    │   • ingestion (adapters)     │
                    │   • reconciliation           │
                    │   • notifications            │
                    │   • payments (Phase 2)       │
                    └───┬───────────┬──────────┬───┘
                        │           │          │
             ┌──────────▼──┐  ┌─────▼─────┐ ┌──▼─────────────┐
             │ PostgreSQL  │  │  Redis    │ │ Queue (BullMQ) │
             │ (Prisma)    │  │ (cache)   │ │  workers       │
             └─────────────┘  └───────────┘ └──┬─────────────┘
                                               │
                        ┌──────────────────────▼───────────────┐
                        │ Provider adapters (pluggable)         │
                        │ • SchoolPayAdapter (Phase 1)          │
                        │ • MtnMomoAdapter / AirtelAdapter (P2)  │
                        │ • BankAdapter(s) (P2)                  │
                        └───────────────────────────────────────┘
```

**Data flow (Phase 1):** provider adapter pulls transactions (sync + webhook) → normalized into `Payment` records → reconciliation worker matches to `Invoice`/`Student` → dashboard reads projections → notification worker fires arrears reminders. Every step writes append-only `LedgerEntry` + emits internal domain events.

---

## 5. Tech Stack (and why)

| Layer | Choice | Rationale |
|---|---|---|
| Language | **TypeScript** end-to-end | One language across web + API; strong typing for money/fintech correctness |
| Web | **Next.js** (App Router, React, Tailwind) | Fast, SSR for SEO (a SchoolPay gap), great DX |
| API | **NestJS** | Opinionated modular structure maps cleanly to bounded contexts |
| ORM/DB | **Prisma + PostgreSQL** | Type-safe queries, migrations, robust relational integrity for ledger data |
| Queue/workers | **BullMQ + Redis** | Reliable async ingestion/reconciliation/notifications with retries |
| Auth | **Session + JWT (short-lived) / OAuth2** | Proper auth from day one; no secrets in URLs |
| Validation | **Zod** (shared schemas) | Runtime + compile-time validation on every boundary |
| Testing | **Vitest/Jest + Playwright** | Unit, integration, e2e |
| API contract | **OpenAPI** (generated) | Sandbox + SDKs later; DX is a core differentiator |
| Infra | **Docker**, deploy to a container host; IaC later | Portable, cloud-agnostic |
| i18n | **next-intl / i18next** | EN now; FR + Amharic ready for expansion |
| Observability | **OpenTelemetry + structured logs** | Auditable, debuggable payments |

Monorepo via **pnpm workspaces** (or Turborepo). If the team is Python-heavy and pushes back, the analytics/ML workers may be Python, but the core platform stays TypeScript.

---

## 6. Repository Structure (target)

```
soma/
├── CLAUDE.md                      # this file
├── docs/
│   ├── architecture.md            # deeper diagrams & ADRs
│   ├── domain-model.md
│   └── adr/                       # architecture decision records
├── apps/
│   ├── web/                       # Next.js dashboard + parent app
│   └── api/                       # NestJS API (bounded contexts as modules)
├── packages/
│   ├── core/                      # domain entities, value objects (Money, Currency)
│   ├── adapters/                  # provider adapters (schoolpay, mtn, airtel, bank)
│   ├── db/                        # Prisma schema, migrations, seed
│   ├── contracts/                 # Zod schemas, shared DTOs, OpenAPI
│   └── config/                    # env, feature flags
├── workers/                       # BullMQ processors (ingestion, recon, notify)
├── infra/                         # docker, compose, IaC
└── test/                          # e2e, fixtures
```

Each API bounded context is a NestJS module: `identity`, `schools` (SIS + invoicing), `payments` (rail + adapters), `reconciliation`, `notifications`, `developer` (public API/sandbox), `wallet`. Cross-context calls go through explicit interfaces, never direct table access into another context. The `payments` context is the licensing-sensitive core — keep it independently auditable.

---

## 7. v1 Feature Breakdown (what to build, by milestone)

**M0 — Foundations**
- F1 — Tenant & auth: School + SchoolGroup + User models; email/OTP + password auth (Argon2/bcrypt); role-based access (Owner, Bursar, Teacher, Viewer, Parent); strict tenant isolation.
- F2 — Ledger & money core: `Money` value object, append-only `LedgerEntry`, double-entry discipline; security baseline (Section 8); observability + audit log.

**M1 — Payment rail (collections)**
- F3 — Rail adapter interface + MTN MoMo and Airtel Money adapters (payment-initiation/debit-prompt, status inquiry). Partner/aggregator mode + direct mode behind one interface (Section 2.1).
- F4 — Soma payment references + `Payment` records; two-step payer flow (code → confirm); no PII before auth.
- F5 — **Outbound webhooks**: signed (HMAC-SHA256), at-least-once with retries + backoff, idempotency keys, replay/reconcile endpoint. Inbound provider callbacks deduped by reference.
- F6 — Bank settlement adapter + settlement/payout reconciliation.

**M2 — School ERP core**
- F7 — SIS: students, classes/streams, terms, enrolment, guardians.
- F8 — Invoicing & fee structures: fee items, term invoices, outstanding-balance computation, arrears aging.
- F9 — **Reconciliation engine**: auto-match Payments → Students → Invoices by payment code / reg number / fuzzy name with a confidence score; manual review queue for low confidence; full audit trail. (This is the product's trust core — test it hardest.)
- F10 — Bursar dashboards + reporting/BI: collections over time, arrears, per-class/per-term; CSV/Excel export.

**M3 — Parent app**
- F11 — Multi-child, multi-school payment; saved payer profiles; receipts; payment history; reminders (SMS/WhatsApp/email, opt-out, rate-limited, no PII in URLs/logs). Web + mobile.

**M4 — Developer platform**
- F12 — Public REST API + OpenAPI spec; sandbox environment + keys; SDKs (TS first); in-portal webhook config + delivery logs.

**M5 — Admissions, wallet, financing hooks**
- F13 — Online admissions/applications (OTP-based, reference tracking).
- F14 — Student wallet (pocket money): deposits, withdrawals, bursar cashout, statements.
- F15 — Feature-flagged seams for Phase-2 financing/savings.

Backlog (Phase 2+): fee installments/BNPL, fees-savings, accounting integrations (QuickBooks/Xero), multi-market currency/i18n rollout (FR, Amharic).

---

## 8. Security & Compliance Principles (LEARN FROM THE INCUMBENT)

These are hard rules, derived directly from SchoolPay's observed weaknesses:

1. **No PII before auth.** A public/pre-auth lookup must never return a student's name, school, or balance. Return only "valid/invalid" or a masked token. (SchoolPay leaked full student records from an unauthenticated `get-student` call — never repeat this.)
2. **Never put secrets/tokens in URLs.** Auth goes in headers. No API key or hash in a path or query string.
3. **Strong crypto only.** HMAC-SHA256 for signatures; Argon2/bcrypt for passwords. **MD5 is banned.**
4. **Idempotency everywhere** money or events are involved (idempotency keys on writes; dedupe inbound webhooks).
5. **At-least-once outbound webhooks** with retries + exponential backoff + signature + a replay/reconcile endpoint. Never at-most-once.
6. **Tenant isolation** enforced in the data layer; every query is scoped by `schoolId`. Add tests that prove cross-tenant access fails.
7. **Minors' data protection by design** — data minimization, encryption at rest for PII, access logging, configurable retention. Align to Uganda Data Protection & Privacy Act and Rwanda Law on Personal Data.
8. **Security headers** on all web responses: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.
9. **Secrets** via env/secret manager, never committed. `.env.example` documents keys with dummy values.
10. **SEO/AI discoverability** (a cheap SchoolPay gap): proper meta tags, OpenGraph, JSON-LD, sitemap.xml, robots.txt, llms.txt on public pages.

---

## 9. Coding Standards & Conventions

- **TypeScript strict mode** on; no `any` without justification.
- **Money**: a `Money` value object (amount: bigint minor units, currency). No floats for money, ever.
- **Validation** at every boundary with Zod; reject unvalidated input.
- **Errors**: typed domain errors; never leak stack traces or internal detail to clients.
- **Tests required** for reconciliation logic, adapters, auth, and tenant isolation. Reconciliation is the product — it must be well-tested.
- **Migrations**: all schema changes via Prisma migrations; never hand-edit the DB.
- **Commits**: conventional commits; small, reviewable PRs.
- **ADRs**: record non-trivial decisions in `docs/adr/`.
- **Feature flags** for anything Phase-2+ so it can be merged dark.

## 10. How Claude Code Should Work in This Repo

- Read this file and `docs/architecture.md` before starting a task.
- Prefer the smallest change that satisfies the task; keep bounded contexts clean.
- When adding a data source, implement the `PaymentProviderAdapter` interface — do **not** special-case SchoolPay elsewhere.
- Write/adjust tests with every behavioral change; run the test suite before declaring done.
- For any money-movement or auth code, call out security implications explicitly in the PR description.
- If a request would violate Section 8, **stop and flag it** rather than implementing it.
- Never commit secrets or real school credentials; use fixtures.

## 11. Glossary

- **Payment code** — a school-assigned identifier (SchoolPay uses 10 digits) that maps a payment to a student.
- **Reconciliation** — matching an incoming Payment to the correct Student and Invoice.
- **Adapter** — a pluggable integration to an external payment rail/source behind a common interface.
- **Rail** — a payment channel (MTN MoMo, Airtel Money, bank) Soma initiates/collects through.
- **Bursar** — the school finance officer; primary ERP user.
- **Partner/aggregator mode** — settling through a licensed third party while Soma's own PSP licence is pending; vs. **direct mode** on our own licence.

---

*Companion file: `SOMA_KICKOFF_PROMPT.md` contains the initial prompt to start the build.*
