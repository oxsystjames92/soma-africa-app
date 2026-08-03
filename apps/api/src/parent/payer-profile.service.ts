import { DomainError } from "@soma/core";
import type { SomaPrismaClient } from "@soma/db";
import type { PaymentChannel } from "../payments/payments.service.js";

export class PayerProfileNotFoundError extends DomainError {
  readonly code = "PAYER_PROFILE_NOT_FOUND";
  constructor() {
    super("Saved number not found");
  }
}

const MAX_PROFILES = 5;

export class TooManyPayerProfilesError extends DomainError {
  readonly code = "TOO_MANY_PAYER_PROFILES";
  constructor() {
    super(`You can save up to ${MAX_PROFILES} numbers`);
  }
}

/**
 * Saved mobile-money numbers (CLAUDE.md §7 F11).
 * Scoped to the parent's identity, so numbers follow them across schools.
 */
export class PayerProfileService {
  constructor(private readonly prisma: SomaPrismaClient) {}

  list(identityId: string) {
    return this.prisma.payerProfile.findMany({
      where: { identityId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true, label: true, msisdn: true, channel: true, isDefault: true },
    });
  }

  async save(
    identityId: string,
    label: string,
    msisdn: string,
    channel: PaymentChannel,
    makeDefault: boolean,
  ) {
    const count = await this.prisma.payerProfile.count({ where: { identityId } });
    const existing = await this.prisma.payerProfile.findUnique({
      where: { identityId_msisdn: { identityId, msisdn } },
    });
    if (!existing && count >= MAX_PROFILES) throw new TooManyPayerProfilesError();

    // The first number saved becomes the default without being asked.
    const isDefault = makeDefault || count === 0;

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.payerProfile.updateMany({ where: { identityId }, data: { isDefault: false } });
      }
      return tx.payerProfile.upsert({
        where: { identityId_msisdn: { identityId, msisdn } },
        update: { label, channel, isDefault },
        create: { identityId, label, msisdn, channel, isDefault },
        select: { id: true, label: true, msisdn: true, channel: true, isDefault: true },
      });
    });
  }

  async remove(identityId: string, profileId: string): Promise<void> {
    const deleted = await this.prisma.payerProfile.deleteMany({
      where: { id: profileId, identityId },
    });
    if (deleted.count === 0) throw new PayerProfileNotFoundError();

    // Never leave a parent with saved numbers but no default.
    const remaining = await this.prisma.payerProfile.findFirst({
      where: { identityId },
      orderBy: { createdAt: "asc" },
    });
    if (remaining && !(await this.hasDefault(identityId))) {
      await this.prisma.payerProfile.update({
        where: { id: remaining.id },
        data: { isDefault: true },
      });
    }
  }

  private async hasDefault(identityId: string): Promise<boolean> {
    return (
      (await this.prisma.payerProfile.count({ where: { identityId, isDefault: true } })) > 0
    );
  }
}
