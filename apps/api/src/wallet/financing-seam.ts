import { DomainError } from "@soma/core";
import { isEnabled } from "@soma/config";

export class FeatureDisabledError extends DomainError {
  readonly code = "FEATURE_DISABLED";
  constructor(feature: string) {
    super(`${feature} is not available`);
  }
}

export class UnlicensedProductError extends DomainError {
  readonly code = "UNLICENSED_PRODUCT";
  constructor(product: string) {
    super(
      `${product} requires a licensed partner. Enabling the flag is not sufficient (CLAUDE.md §2.1).`,
    );
  }
}

/**
 * Phase-2 financing and savings seams (CLAUDE.md §7 F15).
 *
 * These exist so the shape of the integration is settled while the code is
 * still dark: instalment plans and savings products need a licensed lending
 * or deposit-taking partner, which Soma does not have.
 *
 * Two locks, deliberately. The feature flag is the operational switch, and
 * the partner check behind it refuses regardless. A flag flipped by accident
 * — in a config sweep, or by someone testing — must not be able to start
 * offering credit to families.
 */

export interface InstalmentPlanRequest {
  schoolId: string;
  studentId: string;
  invoiceId: string;
  totalMinor: bigint;
  instalments: number;
}

export interface InstalmentPlan {
  planId: string;
  schedule: { dueDate: Date; amountMinor: bigint }[];
}

/** A licensed lender. No implementation ships in v1. */
export interface FinancingPartner {
  readonly name: string;
  createPlan(request: InstalmentPlanRequest): Promise<InstalmentPlan>;
}

/** A licensed deposit taker. No implementation ships in v1. */
export interface SavingsPartner {
  readonly name: string;
  openAccount(schoolId: string, studentId: string): Promise<{ accountId: string }>;
}

export class FinancingSeam {
  constructor(private readonly partner?: FinancingPartner) {}

  available(): boolean {
    return isEnabled("financing") && this.partner !== undefined;
  }

  async createInstalmentPlan(request: InstalmentPlanRequest): Promise<InstalmentPlan> {
    if (!isEnabled("financing")) throw new FeatureDisabledError("Fee instalments");
    // Reached only when the flag is on. Without a partner, still refuse.
    if (!this.partner) throw new UnlicensedProductError("Fee instalments");
    return this.partner.createPlan(request);
  }
}

export class SavingsSeam {
  constructor(private readonly partner?: SavingsPartner) {}

  available(): boolean {
    return isEnabled("savings") && this.partner !== undefined;
  }

  async openAccount(schoolId: string, studentId: string): Promise<{ accountId: string }> {
    if (!isEnabled("savings")) throw new FeatureDisabledError("Fees savings");
    if (!this.partner) throw new UnlicensedProductError("Fees savings");
    return this.partner.openAccount(schoolId, studentId);
  }
}
