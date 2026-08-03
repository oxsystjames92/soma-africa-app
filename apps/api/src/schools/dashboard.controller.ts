import { Controller, Get, Header, Inject, Param, Query, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, Roles, type AuthedRequest } from "../identity/auth.guard.js";
import { DashboardService } from "./dashboard.service.js";
import { InvoicingService } from "./invoicing.service.js";
import { DASHBOARD_SERVICE, INVOICING_SERVICE } from "./schools.tokens.js";

const DaysSchema = z.coerce.number().int().min(1).max(365).default(30);

/**
 * Bursar dashboards and exports (CLAUDE.md §7 F10).
 * Read-only, and every query is scoped by the session's schoolId.
 */
@Controller("dashboard")
@UseGuards(AuthGuard)
@Roles("OWNER", "BURSAR", "VIEWER")
export class DashboardController {
  constructor(
    @Inject(DASHBOARD_SERVICE) private readonly dashboard: DashboardService,
    @Inject(INVOICING_SERVICE) private readonly invoicing: InvoicingService,
  ) {}

  @Get("summary")
  summary(@Req() req: AuthedRequest) {
    return this.dashboard.summary(req.session.schoolId);
  }

  @Get("collections")
  collections(@Req() req: AuthedRequest, @Query("days") days?: string) {
    return this.dashboard.collectionsOverTime(req.session.schoolId, DaysSchema.parse(days));
  }

  @Get("arrears")
  arrears(@Req() req: AuthedRequest) {
    return this.invoicing.arrearsAging(req.session.schoolId);
  }

  @Get("arrears/students")
  arrearsByStudent(@Req() req: AuthedRequest) {
    return this.invoicing.arrearsByStudent(req.session.schoolId);
  }

  @Get("classes/:termId")
  byClass(@Req() req: AuthedRequest, @Param("termId") termId: string) {
    return this.dashboard.byClass(req.session.schoolId, z.string().uuid().parse(termId));
  }

  @Get("export/arrears.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="soma-arrears.csv"')
  arrearsCsv(@Req() req: AuthedRequest): Promise<string> {
    return this.dashboard.arrearsCsv(req.session.schoolId);
  }

  @Get("export/payments.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="soma-payments.csv"')
  paymentsCsv(@Req() req: AuthedRequest, @Query("days") days?: string): Promise<string> {
    return this.dashboard.paymentsCsv(
      req.session.schoolId,
      z.coerce.number().int().min(1).max(365).default(90).parse(days),
    );
  }
}
