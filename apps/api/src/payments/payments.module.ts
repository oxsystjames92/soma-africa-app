import { Logger, Module } from "@nestjs/common";
import {
  AirtelMoneyAdapter,
  FetchTransport,
  MtnMomoAdapter,
  NoopAdapter,
  type HttpTransport,
  type PaymentProviderAdapter,
} from "@soma/adapters";
import type { Env } from "@soma/config";
import type { SomaPrismaClient } from "@soma/db";
import { ENV, PRISMA } from "../identity/identity.tokens.js";
import { IdentityModule } from "../identity/identity.module.js";
import { PaymentsService } from "./payments.service.js";
import {
  HTTP_TRANSPORT,
  PAYMENTS_SERVICE,
  PAYMENT_ADAPTERS,
  RATE_LIMITER,
  WEBHOOK_DELIVERY_SERVICE,
} from "./payments.tokens.js";
import { ProviderCallbackController } from "./provider-callback.controller.js";
import { PublicPaymentsController } from "./public-payments.controller.js";
import { InMemoryRateLimiter } from "./rate-limiter.js";
import { WebhookDeliveryService } from "./webhook-delivery.service.js";
import { WebhooksController } from "./webhooks.controller.js";

/**
 * Registers only the rails that are fully configured. A partially configured
 * rail is left out rather than constructed with blanks — a payment must never
 * be attempted against credentials we do not actually have.
 */
function buildAdapters(env: Env, transport: HttpTransport): Map<string, PaymentProviderAdapter> {
  const logger = new Logger("payments");
  const adapters = new Map<string, PaymentProviderAdapter>();

  if (
    env.MTN_MOMO_BASE_URL &&
    env.MTN_MOMO_SUBSCRIPTION_KEY &&
    env.MTN_MOMO_API_USER &&
    env.MTN_MOMO_API_KEY &&
    env.MTN_MOMO_CALLBACK_SECRET
  ) {
    adapters.set(
      "mtn_momo",
      new MtnMomoAdapter(
        {
          mode: env.RAIL_MODE,
          baseUrl: env.MTN_MOMO_BASE_URL,
          subscriptionKey: env.MTN_MOMO_SUBSCRIPTION_KEY,
          apiUser: env.MTN_MOMO_API_USER,
          apiKey: env.MTN_MOMO_API_KEY,
          callbackSecret: env.MTN_MOMO_CALLBACK_SECRET,
          targetEnvironment: env.MTN_MOMO_TARGET_ENVIRONMENT,
        },
        transport,
      ),
    );
  }

  if (
    env.AIRTEL_BASE_URL &&
    env.AIRTEL_CLIENT_ID &&
    env.AIRTEL_CLIENT_SECRET &&
    env.AIRTEL_CALLBACK_SECRET
  ) {
    adapters.set(
      "airtel_money",
      new AirtelMoneyAdapter(
        {
          mode: env.RAIL_MODE,
          baseUrl: env.AIRTEL_BASE_URL,
          clientId: env.AIRTEL_CLIENT_ID,
          clientSecret: env.AIRTEL_CLIENT_SECRET,
          callbackSecret: env.AIRTEL_CALLBACK_SECRET,
          country: env.AIRTEL_COUNTRY,
          currency: env.AIRTEL_CURRENCY,
        },
        transport,
      ),
    );
  }

  if (adapters.size === 0) {
    logger.warn("No payment rail is configured; falling back to the noop adapter.");
    adapters.set("noop", new NoopAdapter());
  } else {
    logger.log(`Payment rails registered (${env.RAIL_MODE} mode): ${[...adapters.keys()].join(", ")}`);
  }
  return adapters;
}

@Module({
  imports: [IdentityModule],
  controllers: [PublicPaymentsController, ProviderCallbackController, WebhooksController],
  providers: [
    { provide: HTTP_TRANSPORT, useFactory: (): HttpTransport => new FetchTransport() },
    { provide: RATE_LIMITER, useFactory: () => new InMemoryRateLimiter() },
    {
      provide: PAYMENT_ADAPTERS,
      inject: [ENV, HTTP_TRANSPORT],
      useFactory: buildAdapters,
    },
    {
      provide: PAYMENTS_SERVICE,
      inject: [PRISMA, PAYMENT_ADAPTERS],
      useFactory: (prisma: SomaPrismaClient, adapters: Map<string, PaymentProviderAdapter>) =>
        new PaymentsService(prisma, adapters),
    },
    {
      provide: WEBHOOK_DELIVERY_SERVICE,
      inject: [PRISMA, HTTP_TRANSPORT],
      useFactory: (prisma: SomaPrismaClient, transport: HttpTransport) =>
        new WebhookDeliveryService(prisma, transport),
    },
  ],
  exports: [PAYMENTS_SERVICE, WEBHOOK_DELIVERY_SERVICE, PAYMENT_ADAPTERS],
})
export class PaymentsModule {}
