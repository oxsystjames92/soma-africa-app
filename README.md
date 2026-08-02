# Soma

School-payments + school-ERP platform for African education. The modern, secure,
developer-first alternative to incumbents like SchoolPay.

**Read [CLAUDE.md](CLAUDE.md) first** — it is the source of truth for scope,
architecture, domain language, and security guardrails.

## Quickstart

```bash
pnpm install
docker compose -f infra/docker-compose.yml up -d   # Postgres + Redis
cp .env.example .env                                # fill in real values
pnpm db:migrate && pnpm db:seed
pnpm build && pnpm test
```

## Layout

| Path | Purpose |
|---|---|
| `apps/web` | Next.js dashboard + parent app |
| `apps/api` | NestJS API — bounded contexts as modules |
| `packages/core` | Domain entities, value objects (`Money`), typed errors |
| `packages/adapters` | Payment provider adapters behind one interface |
| `packages/db` | Prisma schema, migrations, seed |
| `packages/contracts` | Zod schemas, shared DTOs |
| `packages/config` | Env parsing, feature flags |
| `workers/` | BullMQ processors (ingestion, recon, notify) |
| `infra/` | docker-compose, IaC |
| `docs/adr/` | Architecture decision records |

## Non-negotiables (see CLAUDE.md §8)

- Ledger is **append-only**; money is **bigint minor units + ISO-4217**, never floats.
- Tenant isolation by `schoolId` enforced in the data layer, proven by tests.
- Argon2id for passwords; HMAC-SHA256 for signatures; **MD5 is banned**.
- No PII before auth. No secrets in URLs. At-least-once signed webhooks.
