/**
 * Emits the OpenAPI document to disk so the spec is reviewable in a diff and
 * consumable by SDK generators. Run with `pnpm --filter @soma/api openapi`.
 */
import "reflect-metadata";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module.js";
import { createOpenApiDocument } from "./openapi.js";

/**
 * Emitting the spec only reads route metadata, but constructing the module
 * still validates the environment. Placeholders keep spec generation working
 * in CI and on a fresh clone, where no real credentials exist.
 */
function ensureEnv(): void {
  process.env["DATABASE_URL"] ??= "postgresql://spec:spec@localhost:5432/spec";
  process.env["JWT_SECRET"] ??= "x".repeat(32);
}

async function emit(): Promise<void> {
  ensureEnv();
  const app = await NestFactory.create(AppModule, { logger: ["error"] });
  const document = createOpenApiDocument(app);

  const target = resolve(process.argv[2] ?? "openapi.json");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);

  const paths = Object.keys(document.paths ?? {}).length;
  console.log(`Wrote ${paths} paths to ${target}`);
  await app.close();
}

emit().catch((err: unknown) => {
  console.error("Failed to emit OpenAPI spec:", err);
  process.exit(1);
});
