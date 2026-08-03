import { Module } from "@nestjs/common";
import type { SomaPrismaClient } from "@soma/db";
import { IdentityModule } from "../identity/identity.module.js";
import { PRISMA } from "../identity/identity.tokens.js";
import { ApiKeyGuard } from "./api-key.guard.js";
import { ApiKeyService } from "./api-key.service.js";
import {
  API_KEY_SERVICE,
  IDEMPOTENCY_SERVICE,
  PUBLIC_API_SERVICE,
  SANDBOX_SERVICE,
} from "./developer.tokens.js";
import { IdempotencyService } from "./idempotency.service.js";
import { PortalController } from "./portal.controller.js";
import { PublicApiController } from "./public-api.controller.js";
import { PublicApiService } from "./public-api.service.js";
import { SandboxService } from "./sandbox.service.js";

/** The developer platform: public API, sandbox, keys, webhook management. */
@Module({
  imports: [IdentityModule],
  controllers: [PublicApiController, PortalController],
  providers: [
    {
      provide: API_KEY_SERVICE,
      inject: [PRISMA],
      useFactory: (prisma: SomaPrismaClient) => new ApiKeyService(prisma),
    },
    {
      provide: PUBLIC_API_SERVICE,
      inject: [PRISMA],
      useFactory: (prisma: SomaPrismaClient) => new PublicApiService(prisma),
    },
    {
      provide: SANDBOX_SERVICE,
      inject: [PRISMA],
      useFactory: (prisma: SomaPrismaClient) => new SandboxService(prisma),
    },
    {
      provide: IDEMPOTENCY_SERVICE,
      inject: [PRISMA],
      useFactory: (prisma: SomaPrismaClient) => new IdempotencyService(prisma),
    },
    ApiKeyGuard,
  ],
  exports: [API_KEY_SERVICE, PUBLIC_API_SERVICE, SANDBOX_SERVICE],
})
export class DeveloperModule {}
