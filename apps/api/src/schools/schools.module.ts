import { Module } from "@nestjs/common";
import type { SomaPrismaClient } from "@soma/db";
import { IdentityModule } from "../identity/identity.module.js";
import { PRISMA } from "../identity/identity.tokens.js";
import { ReconciliationController } from "../reconciliation/reconciliation.controller.js";
import { ReconciliationService } from "../reconciliation/reconciliation.service.js";
import { DashboardController } from "./dashboard.controller.js";
import { DashboardService } from "./dashboard.service.js";
import { InvoicingService } from "./invoicing.service.js";
import { DASHBOARD_SERVICE, INVOICING_SERVICE, RECONCILIATION_SERVICE } from "./schools.tokens.js";

/**
 * The schools context: SIS, invoicing, dashboards (F7, F8, F10), plus the
 * reconciliation engine (F9) that joins payments to invoices.
 */
@Module({
  imports: [IdentityModule],
  controllers: [DashboardController, ReconciliationController],
  providers: [
    {
      provide: INVOICING_SERVICE,
      inject: [PRISMA],
      useFactory: (prisma: SomaPrismaClient) => new InvoicingService(prisma),
    },
    {
      provide: DASHBOARD_SERVICE,
      inject: [PRISMA],
      useFactory: (prisma: SomaPrismaClient) => new DashboardService(prisma),
    },
    {
      provide: RECONCILIATION_SERVICE,
      inject: [PRISMA],
      useFactory: (prisma: SomaPrismaClient) => new ReconciliationService(prisma),
    },
  ],
  exports: [INVOICING_SERVICE, DASHBOARD_SERVICE, RECONCILIATION_SERVICE],
})
export class SchoolsModule {}
