# Domain model

The ubiquitous language is defined in [CLAUDE.md](../CLAUDE.md) §3 and implemented in
`packages/core/src/entities.ts` (types) and `packages/db/prisma/schema.prisma` (storage).

## Entities

| Entity | Tenant-scoped | Notes |
|---|---|---|
| `SchoolGroup` | no | Optional parent org owning many Schools |
| `School` | is the tenant | Carries country, currency, timezone |
| `User` | yes | Unique on `(schoolId, email)`; Argon2id hash; role |
| `Student` | yes | `externalRef` holds a legacy payment code on migration |
| `Guardian` | no | Linked to Students many-to-many via `GuardianStudent` |
| `Invoice` | yes | `amountDueMinor` BigInt + currency |
| `Payment` | yes | Unique on `(schoolId, providerRef)` for inbound idempotency |
| `ReconciliationMatch` | via Payment | Unique on `(paymentId, invoiceId)`; carries confidence |
| `PaymentProvider` | optional | Rail configuration |
| `WebhookEvent` | no | Inbound and outbound, with attempt count and status |
| `LedgerEntry` | yes | **Append-only.** Every financial fact, immutable |

## Rules

- Money is always `bigint` minor units plus ISO-4217 currency — never a float, never a
  bare number without its currency.
- The ledger is never updated or deleted. A correction is a new entry of type
  `ADJUSTMENT` or `PAYMENT_REVERSED` referencing the original.
- Every tenant-owned table carries `schoolId` and is indexed on it.
- A `Payment` may exist without a `Student` (unreconciled); reconciliation attaches it.
