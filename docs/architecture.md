# Architecture

Deeper diagrams live here as the system grows. See [CLAUDE.md](../CLAUDE.md) §4 for the
canonical overview and [`adr/`](adr/) for decisions.

## Shape today (M0)

```
apps/web (Next.js)  ──REST──▶  apps/api (NestJS)  ──▶  PostgreSQL (Prisma)
                                     │                       ▲
                                     │                       │
                                     └──▶ Redis / BullMQ ─────┘
                                              workers/
```

`apps/api` is a modular monolith. Each bounded context is a NestJS module; cross-context
calls go through explicit interfaces, never direct table access into another context.

| Context | Module | Status |
|---|---|---|
| identity | `src/identity` | **M0 — shipped**: Argon2id + OTP auth, JWT sessions, RBAC, tenant guard |
| payments | `src/payments` | **M1 — shipped**: MTN + Airtel rails, two-step payer flow, signed at-least-once webhooks, replay/reconcile |
| schools (SIS + invoicing) | — | M2 |
| reconciliation | — | M2 |
| notifications | — | M3 |
| developer | — | M4 |
| wallet | — | M5 |

## Invariants that outlive any milestone

**Money.** `Money` (packages/core) holds `bigint` minor units plus an ISO-4217 currency.
Float construction throws; cross-currency arithmetic throws. Database columns are
`BigInt` + a currency string.

**Ledger.** `LedgerEntry` is append-only, enforced by a PostgreSQL trigger
(`soma_ledger_append_only`) and a Prisma client extension. Corrections are new entries.

**Tenancy.** `tenantScoped(client, schoolId)` from `@soma/db` AND-s `schoolId` into every
read and forces it onto every write. Scope comes from the verified session, never from
request input.

**Adapters.** Every payment rail implements `PaymentProviderAdapter`
(`initiatePayment`, `checkStatus`, `verifyInboundSignature`, `parseWebhook`). Partner and
direct licensing modes sit behind the same interface.

## The payment path

```
payer                    Soma                         rail
  │  code ─────────────▶ lookup ── validity + opaque token
  │  amount + phone ───▶ confirm ─── initiate ──────▶ debit prompt
  │                                                       │
  │                      callback ◀── signed callback ─────┘
  │                         │
  │                         ├── verify signature over RAW bytes
  │                         ├── dedupe on (provider, eventId)
  │                         └── ONE transaction:
  │                               payment → SUCCEEDED
  │                               append LedgerEntry
  │                               write WebhookDelivery rows
  │                                        │
school receiver ◀── signed, retried ───────┘  (outbox drain)
```

Two guarantees hold this together. **Nothing about a student crosses the pre-auth
boundary** — lookup returns validity and a token, never a name, school, or balance
(§8.1). And the **outbox** means the delivery row commits with the money it describes,
so no crash can record a payment while losing its notification.

## Queues

Names and shared options live in `workers/src/queues.ts`. The webhook drain
(`workers/src/webhook-drain.ts`) sweeps the outbox; BullMQ schedules it but is not the
source of truth, so a Redis outage delays delivery rather than losing events. Retries
back off exponentially with full jitter for 8 attempts (CLAUDE.md §8.5).

## Local development

```bash
docker compose -f infra/docker-compose.yml up -d   # Postgres :5434, Redis :6379
pnpm db:migrate && pnpm db:seed
pnpm build && pnpm test
```
