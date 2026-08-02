import type { Role } from "@soma/contracts";
import type { SomaPrismaClient } from "@soma/db";

export interface IdentityUser {
  id: string;
  schoolId: string;
  email: string;
  passwordHash: string;
  role: Role;
  otpHash: string | null;
  otpExpiresAt: Date | null;
}

/** Data access for the identity context — always keyed by (schoolId, email). */
export interface UserRepository {
  findByEmail(schoolId: string, email: string): Promise<IdentityUser | null>;
  setOtp(userId: string, otpHash: string, expiresAt: Date): Promise<void>;
  clearOtp(userId: string): Promise<void>;
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: SomaPrismaClient) {}

  findByEmail(schoolId: string, email: string): Promise<IdentityUser | null> {
    return this.prisma.user.findUnique({
      where: { schoolId_email: { schoolId, email } },
    }) as Promise<IdentityUser | null>;
  }

  async setOtp(userId: string, otpHash: string, expiresAt: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { otpHash, otpExpiresAt: expiresAt },
    });
  }

  async clearOtp(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { otpHash: null, otpExpiresAt: null },
    });
  }
}
