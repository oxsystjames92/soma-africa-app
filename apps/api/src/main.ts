import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { loadEnv } from "@soma/config";
import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);

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
  await app.listen(env.API_PORT);
}

void bootstrap();
