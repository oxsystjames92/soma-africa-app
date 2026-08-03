# Architecture decision records

One record per milestone, covering the decisions that were not obvious and the
trade-offs taken under ambiguity. Each closes with consequences, including the ones
that are inconvenient.

| ADR | Milestone | Decides |
|---|---|---|
| [0001](0001-stack-and-architecture.md) | M0 | Modular monolith over microservices; TypeScript end to end; `Money` as bigint minor units; append-only ledger enforced twice; tenant scoping in the data layer; Argon2id and short-lived JWTs |
| [0002](0002-payments-context.md) | M1 | Direct (own-licence) mode throws until Soma holds a licence; signatures verified over raw bytes; transactional outbox for webhooks; timestamp-bound signatures; jittered backoff; polled reconciliation reuses the callback path |
| [0003](0003-reconciliation-engine.md) | M2 | The matcher is a pure function; ambiguity is checked before confidence; names alone never auto-confirm; money moves only on CONFIRMED matches; oldest invoice first; append-only audit trail |
| [0004](0004-parent-identity.md) | M3 | Parent identity deliberately crosses tenants; access derived from student linkage; distinct JWT audience for parent sessions; reminder limits count per person; reminder clock is the service's, not the database's |
| [0005](0005-developer-platform.md) | M4 | A sandbox is a TEST-mode school; API keys use SHA-256 rather than Argon2id, and why that is not a weakening; keys in query strings are refused; the published spec covers only `/v1` |
| [0006](0006-wallet-and-admissions.md) | M5 | Wallet balances move through a conditional update that cannot overdraw; amounts stored unsigned; admissions credential is reference plus phone; Phase-2 seams sit behind two locks |

## Cross-cutting rules these records established

**Four tables are immutable by database trigger**, not by policy: `LedgerEntry`,
`ReconciliationAudit`, `WalletEntry`, `ApplicationEvent`. Corrections are new rows.
A table holding a fact a school or family could dispute belongs on this list.

**Tenancy has two shapes.** Staff are scoped by `schoolId` from their session;
parents by linkage to specific students. An endpoint guarded by neither is a bug
(ADR-0004). Live versus sandbox is the same boundary again, because a sandbox is a
tenant (ADR-0005).

**Money never touches a float**, never crosses the wire as a JSON number, and moves
through exactly one routine per context — `createAndInitiate` for payments,
`move` for wallets.

**Unauthenticated surfaces answer uniformly.** Unknown account, wrong password,
wrong tenant, unknown payment code, unknown application reference — all answered
the same way, so none can be used to enumerate.

**Licensing is enforced in code, not configuration.** Direct rail mode throws on
construction (ADR-0002); financing and savings refuse behind both a flag and a
missing partner (ADR-0006).
