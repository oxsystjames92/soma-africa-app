import { Logger, Module } from "@nestjs/common";
import type { Env } from "@soma/config";
import type { SomaPrismaClient } from "@soma/db";
import { IdentityModule } from "../identity/identity.module.js";
import { ENV, PRISMA } from "../identity/identity.tokens.js";
import { PaymentsModule } from "../payments/payments.module.js";
import { PAYMENTS_SERVICE } from "../payments/payments.tokens.js";
import type { PaymentsService } from "../payments/payments.service.js";
import { InMemoryRateLimiter } from "../payments/rate-limiter.js";
import { GuardianAuthService, type OtpDispatcher } from "./guardian-auth.service.js";
import { GuardianGuard } from "./guardian.guard.js";
import { GuardianTokenService } from "./guardian-token.service.js";
import { LoggingChannel, maskDestination, type NotificationChannel, type ReminderChannelName } from "./notification-channel.js";
import { ParentAuthController, ParentController } from "./parent.controller.js";
import { ParentService } from "./parent.service.js";
import {
  GUARDIAN_AUTH_SERVICE,
  GUARDIAN_TOKEN_SERVICE,
  PARENT_RATE_LIMITER,
  PARENT_SERVICE,
  PAYER_PROFILE_SERVICE,
  REMINDER_SERVICE,
} from "./parent.tokens.js";
import { PayerProfileService } from "./payer-profile.service.js";
import { ReminderService } from "./reminder.service.js";

/** M3 OTP delivery stub — logs that a code was sent, never the code itself. */
class LogOtpDispatcher implements OtpDispatcher {
  private readonly logger = new Logger("parent-auth");
  async send(phone: string): Promise<void> {
    this.logger.log(`Login code issued to ${maskDestination(phone)}`);
  }
}

function parseTtlSeconds(expiresIn: string): number {
  const match = /^(\d+)([smh])$/.exec(expiresIn);
  if (!match) return 900;
  const value = Number(match[1]);
  return match[2] === "h" ? value * 3600 : match[2] === "m" ? value * 60 : value;
}

/**
 * The parent context (CLAUDE.md §7 F11).
 *
 * Depends on PaymentsModule for money movement and adds none of its own —
 * ParentService proves linkage then delegates, so there is still exactly one
 * place that creates a Payment and calls a rail.
 */
@Module({
  imports: [IdentityModule, PaymentsModule],
  controllers: [ParentAuthController, ParentController],
  providers: [
    {
      provide: GUARDIAN_TOKEN_SERVICE,
      inject: [ENV],
      useFactory: (env: Env) =>
        // Parent sessions live longer than staff sessions: a parent checking
        // fees monthly should not be re-authenticated mid-payment.
        new GuardianTokenService(env.JWT_SECRET, parseTtlSeconds(env.JWT_EXPIRES_IN) * 4),
    },
    { provide: PARENT_RATE_LIMITER, useFactory: () => new InMemoryRateLimiter(5, 60_000) },
    {
      provide: GUARDIAN_AUTH_SERVICE,
      inject: [PRISMA, GUARDIAN_TOKEN_SERVICE],
      useFactory: (prisma: SomaPrismaClient, tokens: GuardianTokenService) =>
        new GuardianAuthService(prisma, tokens, new LogOtpDispatcher()),
    },
    {
      provide: PARENT_SERVICE,
      inject: [PRISMA, PAYMENTS_SERVICE],
      useFactory: (prisma: SomaPrismaClient, payments: PaymentsService) =>
        new ParentService(prisma, payments),
    },
    {
      provide: PAYER_PROFILE_SERVICE,
      inject: [PRISMA],
      useFactory: (prisma: SomaPrismaClient) => new PayerProfileService(prisma),
    },
    {
      provide: REMINDER_SERVICE,
      inject: [PRISMA],
      useFactory: (prisma: SomaPrismaClient) => {
        const channels = new Map<ReminderChannelName, NotificationChannel>([
          ["SMS", new LoggingChannel("SMS")],
          ["WHATSAPP", new LoggingChannel("WHATSAPP")],
          ["EMAIL", new LoggingChannel("EMAIL")],
        ]);
        return new ReminderService(prisma, channels);
      },
    },
    GuardianGuard,
  ],
  exports: [PARENT_SERVICE, REMINDER_SERVICE, GUARDIAN_TOKEN_SERVICE],
})
export class ParentModule {}
