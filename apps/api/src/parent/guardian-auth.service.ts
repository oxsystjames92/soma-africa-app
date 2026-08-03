import { randomInt } from "node:crypto";
import argon2 from "argon2";
import { AuthenticationError, DomainError } from "@soma/core";
import type { SomaPrismaClient } from "@soma/db";
import type { GuardianTokenService } from "./guardian-token.service.js";

export class TooManyOtpAttemptsError extends DomainError {
  readonly code = "OTP_LOCKED";
  constructor() {
    super("Too many incorrect codes. Request a new one.");
  }
}

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

/** Delivers the login code out of band. */
export interface OtpDispatcher {
  send(phone: string, code: string): Promise<void>;
}

export interface GuardianSession {
  accessToken: string;
  expiresIn: number;
}

/**
 * Parent login: phone number plus a one-time code.
 *
 * Parents have no password and no email in the general case — a phone is the
 * only identifier a Ugandan school reliably holds. Requesting a code never
 * reveals whether an account exists, and codes are single-use with a hard
 * attempt cap so a six-digit space cannot be walked.
 */
export class GuardianAuthService {
  constructor(
    private readonly prisma: SomaPrismaClient,
    private readonly tokens: GuardianTokenService,
    private readonly dispatcher: OtpDispatcher,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Send a login code, but only to a phone a school has already registered
   * as a guardian. Always resolves — an unknown number gets silence, not an
   * error, so this endpoint cannot be used to enumerate parents.
   */
  async requestOtp(phone: string): Promise<void> {
    const identity = await this.resolveIdentity(phone);
    if (!identity) return;

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await this.prisma.guardianIdentity.update({
      where: { id: identity.id },
      data: {
        otpHash: await argon2.hash(code, { type: argon2.argon2id }),
        otpExpiresAt: new Date(this.now().getTime() + OTP_TTL_MS),
        otpAttempts: 0,
      },
    });
    await this.dispatcher.send(phone, code);
  }

  async verifyOtp(phone: string, code: string): Promise<GuardianSession> {
    const identity = await this.prisma.guardianIdentity.findUnique({ where: { phone } });
    if (!identity?.otpHash || !identity.otpExpiresAt || identity.otpExpiresAt < this.now()) {
      throw new AuthenticationError();
    }
    if (identity.otpAttempts >= MAX_OTP_ATTEMPTS) {
      throw new TooManyOtpAttemptsError();
    }

    const valid = await argon2.verify(identity.otpHash, code).catch(() => false);
    if (!valid) {
      await this.prisma.guardianIdentity.update({
        where: { id: identity.id },
        data: { otpAttempts: { increment: 1 } },
      });
      throw new AuthenticationError();
    }

    // Single use: clear the code the moment it works.
    await this.prisma.guardianIdentity.update({
      where: { id: identity.id },
      data: {
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        lastLoginAt: this.now(),
      },
    });

    return {
      accessToken: this.tokens.sign({ gid: identity.id }),
      expiresIn: this.tokens.ttlSeconds,
    };
  }

  /**
   * Find or create the platform-wide identity behind a phone number.
   *
   * A Guardian record is created by a school when it registers a parent, so
   * the identity is only ever minted for a number a school already knows.
   * Self-registration would let anyone claim to be a parent.
   */
  private async resolveIdentity(phone: string): Promise<{ id: string } | null> {
    const existing = await this.prisma.guardianIdentity.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (existing) return existing;

    const guardians = await this.prisma.guardian.findMany({
      where: { phone, identityId: null },
      select: { id: true, locale: true },
    });
    if (guardians.length === 0) return null;

    const identity = await this.prisma.guardianIdentity.create({
      data: { phone, locale: guardians[0]!.locale },
      select: { id: true },
    });
    // Claim every school's record for this number in one go — this is what
    // makes one login span schools.
    await this.prisma.guardian.updateMany({
      where: { phone, identityId: null },
      data: { identityId: identity.id },
    });
    return identity;
  }
}
