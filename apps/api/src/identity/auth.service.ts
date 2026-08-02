import { randomInt } from "node:crypto";
import argon2 from "argon2";
import type { Role, SessionResponse } from "@soma/contracts";
import { AuthenticationError } from "@soma/core";
import { TokenService } from "./token.service.js";
import type { UserRepository } from "./user.repository.js";

const OTP_TTL_MS = 5 * 60 * 1000;

/** Delivers OTPs out-of-band (SMS/email). M0 ships a log-only implementation. */
export interface OtpSender {
  send(email: string, code: string): Promise<void>;
}

/**
 * Email/OTP + password authentication (CLAUDE.md §7 F1).
 * Argon2id only — MD5 is banned (§8.3). Failures are uniform: the caller
 * never learns whether the account exists or which factor failed.
 */
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
    private readonly otpSender: OtpSender,
  ) {}

  static hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async login(schoolId: string, email: string, password: string): Promise<SessionResponse> {
    const user = await this.users.findByEmail(schoolId, email);
    // Verify against a dummy hash on miss to keep timing uniform.
    const hash =
      user?.passwordHash ??
      "$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const valid = await argon2.verify(hash, password).catch(() => false);
    if (!user || !valid) throw new AuthenticationError();
    return this.issueSession(user.id, user.schoolId, user.role);
  }

  async requestOtp(schoolId: string, email: string): Promise<void> {
    const user = await this.users.findByEmail(schoolId, email);
    // Silently no-op on unknown accounts — do not reveal existence.
    if (!user) return;
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await this.users.setOtp(user.id, await argon2.hash(code), new Date(Date.now() + OTP_TTL_MS));
    await this.otpSender.send(user.email, code);
  }

  async verifyOtp(schoolId: string, email: string, code: string): Promise<SessionResponse> {
    const user = await this.users.findByEmail(schoolId, email);
    if (!user?.otpHash || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new AuthenticationError();
    }
    const valid = await argon2.verify(user.otpHash, code).catch(() => false);
    if (!valid) throw new AuthenticationError();
    await this.users.clearOtp(user.id); // single-use
    return this.issueSession(user.id, user.schoolId, user.role);
  }

  private issueSession(sub: string, schoolId: string, role: Role): SessionResponse {
    return {
      accessToken: this.tokens.sign({ sub, schoolId, role }),
      expiresIn: this.tokens.ttlSeconds,
    };
  }
}
