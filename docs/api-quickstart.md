# Soma API quickstart

From zero to a verified webhook in about five minutes. Everything below runs
against the sandbox, so nothing here can move money.

## 1. Get a sandbox and a key

In the Soma portal, as an Owner:

1. **Developers → Create sandbox.** You get a test school seeded with four
   students and open invoices, so your first call returns something useful.
2. **Developers → New key.** Pick the narrowest scopes that do the job.
   The key is shown **once**. Store it now; you cannot read it back.

Sandbox keys start `sk_test_`, live keys `sk_live_`. They are different
tenants — a test key cannot see live rows, and no test call moves money.

## 2. Make your first call

```bash
curl https://api.soma-africa.com/v1/students \
  -H "Authorization: Bearer sk_test_a1b2c3d4_..."
```

Keys go in the header. **Never in a query string** — URLs end up in browser
history, proxy logs, and `Referer` headers, so a key in one is already leaked.
Soma rejects any request that puts a key in the URL rather than accepting it.

```json
{
  "data": [
    {
      "id": "…",
      "firstName": "Amina",
      "lastName": "Nakato",
      "className": "P5",
      "externalRef": "1000000001",
      "regNumber": "SBX/2026/001",
      "status": "ENROLLED"
    }
  ],
  "hasMore": true,
  "nextCursor": "…"
}
```

## 3. Money is a string

```json
{ "amountDueMinor": "4500000", "currency": "UGX" }
```

That is **UGX 45,000.00** — minor units, as a decimal string.

JSON numbers cannot hold large integers exactly, and a school's termly billing
runs past that limit quickly. Parse with `BigInt`:

```ts
const owed = BigInt(invoice.amountDueMinor); // 4500000n
// Never: parseFloat(invoice.amountDueMinor)
```

## 4. Install the SDK

```bash
pnpm add @soma/sdk
```

```ts
import { Soma } from "@soma/sdk";

const soma = new Soma({ apiKey: process.env.SOMA_API_KEY! });

const students = await soma.students.list({ limit: 25 });
const invoices = await soma.invoices.list({ studentId: students.data[0].id });
```

The client retries `408`, `429`, and `5xx` with exponential backoff and
jitter, and never retries a `4xx` — that request will fail identically the
second time, and blind retries on writes are how duplicate payments happen.

Errors are typed, so branch on cause instead of parsing strings:

```ts
import { PermissionError, NotFoundError } from "@soma/sdk";

try {
  await soma.students.retrieve(id);
} catch (err) {
  if (err instanceof PermissionError) { /* key is missing a scope */ }
  if (err instanceof NotFoundError) { /* wrong tenant, or gone */ }
}
```

## 5. Receive a webhook

Register an endpoint. **The secret is returned once.**

```ts
const endpoint = await soma.webhooks.createEndpoint("https://you.example/soma");
console.log(endpoint.secret); // whsec_… — store it now
```

Verify every delivery. The SDK ships the verifier because hand-rolled ones
usually get one of three things wrong: comparing with `===` (timing leak),
ignoring the timestamp (replayable forever), or verifying a re-serialized
object instead of the raw bytes.

```ts
import express from "express";
import { assertWebhookSignature } from "@soma/sdk";

const app = express();

app.post(
  "/soma",
  // Raw body, not express.json(). Re-stringifying changes the bytes and the
  // signature will not match.
  express.raw({ type: "application/json" }),
  (req, res) => {
    assertWebhookSignature({
      rawBody: req.body.toString("utf8"),
      signatureHeader: req.header("Soma-Signature")!,
      secret: process.env.SOMA_WEBHOOK_SECRET!,
    });

    const event = JSON.parse(req.body.toString("utf8"));
    // Respond fast; do the work after.
    res.sendStatus(200);
  },
);
```

## 6. Fire an event on demand

You should not have to wait for a real parent to pay in order to test your
handler.

```ts
await soma.sandbox.simulatePayment({ amountMinor: "4500000" });
```

## 7. Delivery guarantees, and what they mean for you

Delivery is **at least once**, never at most once. Retries run with
exponential backoff for eight attempts before a delivery is marked dead.

That means **you will occasionally receive the same event twice** — after a
timeout where we never saw your `200`, for instance. Dedupe on the header,
which is stable across every retry of the same event:

```ts
const key = req.header("Soma-Idempotency-Key")!;
if (await alreadyProcessed(key)) return res.sendStatus(200);
```

When something looks wrong, read the log rather than guessing:

```ts
const failing = await soma.webhooks.listDeliveries({ status: "DEAD" });
// attempts, lastError, nextAttemptAt — enough to diagnose without a support ticket
```

## 8. Idempotency on writes

Send an `Idempotency-Key` on any write you might retry:

```ts
await soma.webhooks.createEndpoint("https://you.example/soma", crypto.randomUUID());
```

A retry with the same key returns the original response instead of acting
twice. Reusing a key with a **different** body is rejected rather than quietly
answered — that mismatch is a bug on the client side, and hiding it would cost
you more than the error does.

## Reference

- Interactive docs: `/docs`
- Machine-readable spec: [`openapi.json`](openapi.json), also served at `/docs-json`
