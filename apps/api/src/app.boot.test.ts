/**
 * The application actually boots.
 *
 * Every other test constructs services directly, which is fast and focused
 * but never exercises the dependency graph. A missing module export therefore
 * passed the whole suite while leaving the API unable to start — exactly what
 * happened when PaymentsModule needed ENV that IdentityModule did not export.
 * This test is cheap insurance against that class of failure.
 */
import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { createOpenApiDocument } from "./developer/openapi.js";

const hasDb = !!process.env.DATABASE_URL;
const d = describe.skipIf(!hasDb);

let app: INestApplication;

beforeAll(async () => {
  if (!hasDb) return;
  process.env["JWT_SECRET"] ??= "x".repeat(32);
  app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
});

afterAll(async () => {
  if (app) await app.close();
});

d("application graph", () => {
  it("resolves every provider across every context", () => {
    expect(app).toBeDefined();
  });

  it("publishes an OpenAPI document covering the public API only", () => {
    const document = createOpenApiDocument(app);
    const paths = Object.keys(document.paths ?? {});

    expect(paths.length).toBeGreaterThan(0);
    // Every published path is public and versioned.
    for (const path of paths) expect(path.startsWith("/v1/")).toBe(true);

    // Internal surfaces stay unpublished: documenting them would invite
    // integration against routes we intend to change freely.
    for (const internal of ["/parent", "/dashboard", "/reconciliation", "/auth", "/portal"]) {
      expect(paths.some((p) => p.startsWith(internal))).toBe(false);
    }
  });

  it("documents bearer authentication so the spec is usable", () => {
    const document = createOpenApiDocument(app);
    expect(document.components?.securitySchemes?.["bearer"]).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
  });
});
