import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";
import { DeveloperModule } from "./developer.module.js";

/**
 * Build the published document.
 *
 * Scoped to DeveloperModule so the spec describes the public API and nothing
 * else. Staff dashboards, the parent app, and provider callbacks are internal
 * surfaces: publishing them would invite integration against routes we intend
 * to change freely, and would advertise endpoints an API key cannot call.
 */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(app, buildOpenApiConfig(), {
    include: [DeveloperModule],
  });
}

/**
 * The OpenAPI document.
 *
 * The description is the first thing an integrator reads, so it answers the
 * questions that otherwise become support tickets: how to authenticate, what
 * sandbox means, why amounts are strings, and what webhook delivery
 * guarantees. DX is a differentiator (CLAUDE.md §1), and undocumented
 * behaviour is the incumbent's actual product.
 */
export function buildOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle("Soma API")
    .setVersion("1.0.0")
    .setDescription(
      [
        "School payments and operations for African education.",
        "",
        "## Authentication",
        "",
        "Send your key in a header. Never in a URL — query strings end up in browser",
        "history, proxy logs, and Referer headers, so a key in one is already leaked.",
        "",
        "```",
        "Authorization: Bearer sk_test_a1b2c3d4_...",
        "```",
        "",
        "Keys are scoped. A key can only do what it was granted: `students:read`,",
        "`payments:write`, and so on. Ask for the narrowest set that works.",
        "",
        "## Live and sandbox",
        "",
        "A `sk_test_` key reads and writes a sandbox school, seeded with students and",
        "open invoices so you can make a useful call immediately. A `sk_live_` key",
        "reaches real data. They are separate tenants: a test key cannot see live rows,",
        "and no test call can move money.",
        "",
        "Drive a payment to completion without a rail:",
        "",
        "```",
        "POST /v1/sandbox/simulate/payment",
        "```",
        "",
        "## Amounts",
        "",
        "Money is **minor units as a string** — `\"4500000\"` is UGX 45,000.00. JSON",
        "numbers cannot hold large integers exactly, and a silently rounded fee is the",
        "bug this API exists to avoid. Parse with `BigInt`, never `parseFloat`.",
        "",
        "## Pagination",
        "",
        "Cursor based. Pass the `nextCursor` from a response as `cursor` on the next",
        "request. Cursors are stable while rows are inserted; offsets are not.",
        "",
        "## Idempotency",
        "",
        "Send an `Idempotency-Key` header on writes. A retry with the same key returns",
        "the original response instead of acting twice. Reusing a key with a different",
        "body is rejected rather than silently answered.",
        "",
        "## Webhooks",
        "",
        "Deliveries are signed `HMAC-SHA256` over `{timestamp}.{body}` and sent as",
        "`Soma-Signature: t=...,v1=...`. Reject anything older than five minutes.",
        "",
        "Delivery is **at least once**: retries run with exponential backoff for eight",
        "attempts. The `Soma-Idempotency-Key` header is stable across retries, so",
        "dedupe on it. Inspect any delivery, its attempt count, and its last error at",
        "`GET /v1/webhooks/deliveries`.",
      ].join("\n"),
    )
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        description: "Your API key, e.g. sk_test_a1b2c3d4_...",
      },
      "bearer",
    )
    .addServer("https://api.soma-africa.com", "Production")
    .addServer("http://localhost:4000", "Local")
    .build();
}
