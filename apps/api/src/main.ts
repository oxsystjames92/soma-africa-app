import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { loadEnv } from "@soma/config";
import { AppModule } from "./app.module.js";
import { createOpenApiDocument } from "./developer/openapi.js";

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  // rawBody: provider callback signatures are computed over the exact bytes
  // sent. Verifying a re-serialized object would authenticate different bytes
  // than the ones we act on.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Security baseline — CLAUDE.md §8.8
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      strictTransportSecurity: { maxAge: 63072000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      frameguard: { action: "deny" },
      noSniff: true,
    }),
  );
  app.use((_req: unknown, res: { setHeader(k: string, v: string): void }, next: () => void) => {
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    next();
  });

  app.enableCors({ origin: env.WEB_URL, credentials: true });

  // Interactive docs at /docs, machine-readable spec at /docs-json.
  const document = createOpenApiDocument(app);
  SwaggerModule.setup("docs", app, document, {
    customSiteTitle: "Soma API",
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(env.API_PORT);
}

void bootstrap();
