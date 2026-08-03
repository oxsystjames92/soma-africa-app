import { Logger, Module } from "@nestjs/common";
import type { SomaPrismaClient } from "@soma/db";
import { IdentityModule } from "../identity/identity.module.js";
import { PRISMA } from "../identity/identity.tokens.js";
import { AdmissionsController, PublicAdmissionsController } from "../admissions/admissions.controller.js";
import { AdmissionsService, type OtpSender } from "../admissions/admissions.service.js";
import { ADMISSIONS_RATE_LIMITER, ADMISSIONS_SERVICE } from "../admissions/admissions.tokens.js";
import { maskDestination } from "../parent/notification-channel.js";
import { InMemoryRateLimiter } from "../payments/rate-limiter.js";
import { FinancingSeam, SavingsSeam } from "./financing-seam.js";
import { WalletController } from "./wallet.controller.js";
import { WalletService } from "./wallet.service.js";
import { FINANCING_SEAM, SAVINGS_SEAM, WALLET_SERVICE } from "./wallet.tokens.js";

/** Delivery stub — logs that a code went out, never the code. */
class LogOtpSender implements OtpSender {
  private readonly logger = new Logger("admissions");
  async send(phone: string): Promise<void> {
    this.logger.log(`Status code issued to ${maskDestination(phone)}`);
  }
}

/**
 * M5: admissions, pocket-money wallets, and the Phase-2 seams.
 *
 * The financing and savings seams are constructed without a partner, so they
 * refuse every call regardless of how their feature flags are set.
 */
@Module({
  imports: [IdentityModule],
  controllers: [WalletController, AdmissionsController, PublicAdmissionsController],
  providers: [
    {
      provide: WALLET_SERVICE,
      inject: [PRISMA],
      useFactory: (prisma: SomaPrismaClient) => new WalletService(prisma),
    },
    {
      provide: ADMISSIONS_SERVICE,
      inject: [PRISMA],
      useFactory: (prisma: SomaPrismaClient) =>
        new AdmissionsService(prisma, new LogOtpSender()),
    },
    { provide: ADMISSIONS_RATE_LIMITER, useFactory: () => new InMemoryRateLimiter(5, 60_000) },
    // No partner is supplied: Soma holds no lending or deposit-taking licence.
    { provide: FINANCING_SEAM, useFactory: () => new FinancingSeam() },
    { provide: SAVINGS_SEAM, useFactory: () => new SavingsSeam() },
  ],
  exports: [WALLET_SERVICE, ADMISSIONS_SERVICE, FINANCING_SEAM, SAVINGS_SEAM],
})
export class WalletModule {}
