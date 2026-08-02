import { Logger, Module } from "@nestjs/common";
import { loadEnv, type Env } from "@soma/config";
import { createPrismaClient } from "@soma/db";
import { AuthController } from "./auth.controller.js";
import { AuthGuard } from "./auth.guard.js";
import { AuthService, type OtpSender } from "./auth.service.js";
import { AUTH_SERVICE, ENV, PRISMA, TOKEN_SERVICE, USER_REPOSITORY } from "./identity.tokens.js";
import { TokenService } from "./token.service.js";
import { PrismaUserRepository, type UserRepository } from "./user.repository.js";

/** M0 OTP delivery: log-only (code redacted). Real SMS/email lands with M3 notifications. */
class LogOtpSender implements OtpSender {
  private readonly logger = new Logger("otp");
  async send(email: string): Promise<void> {
    this.logger.log(`OTP issued for ***${email.slice(-4)} (delivery stub)`);
  }
}

function parseTtlSeconds(expiresIn: string): number {
  const match = /^(\d+)([smh])$/.exec(expiresIn);
  if (!match) return 900;
  const value = Number(match[1]);
  return match[2] === "h" ? value * 3600 : match[2] === "m" ? value * 60 : value;
}

@Module({
  controllers: [AuthController],
  providers: [
    { provide: ENV, useFactory: (): Env => loadEnv() },
    { provide: PRISMA, useFactory: () => createPrismaClient() },
    {
      provide: TOKEN_SERVICE,
      inject: [ENV],
      useFactory: (env: Env) => new TokenService(env.JWT_SECRET, parseTtlSeconds(env.JWT_EXPIRES_IN)),
    },
    {
      provide: USER_REPOSITORY,
      inject: [PRISMA],
      useFactory: (prisma: ReturnType<typeof createPrismaClient>) =>
        new PrismaUserRepository(prisma),
    },
    {
      provide: AUTH_SERVICE,
      inject: [USER_REPOSITORY, TOKEN_SERVICE],
      useFactory: (users: UserRepository, tokens: TokenService) =>
        new AuthService(users, tokens, new LogOtpSender()),
    },
    AuthGuard,
  ],
  exports: [TOKEN_SERVICE, PRISMA, AuthGuard],
})
export class IdentityModule {}
