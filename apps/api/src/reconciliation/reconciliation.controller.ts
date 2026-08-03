import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, Roles, type AuthedRequest } from "../identity/auth.guard.js";
import { RECONCILIATION_SERVICE } from "../schools/schools.tokens.js";
import { ReconciliationService } from "./reconciliation.service.js";

const RejectSchema = z.object({ reason: z.string().min(3).max(500) });
const UuidSchema = z.string().uuid();

/**
 * The manual review queue (CLAUDE.md §7 F9).
 *
 * Confirming a match moves real money onto a real invoice, so it is limited
 * to OWNER and BURSAR — a TEACHER or VIEWER can see arrears but cannot decide
 * where a payment lands.
 */
@Controller("reconciliation")
@UseGuards(AuthGuard)
export class ReconciliationController {
  constructor(
    @Inject(RECONCILIATION_SERVICE) private readonly reconciliation: ReconciliationService,
  ) {}

  @Get("queue")
  @Roles("OWNER", "BURSAR", "VIEWER")
  queue(@Req() req: AuthedRequest) {
    return this.reconciliation.reviewQueue(req.session.schoolId);
  }

  @Get("unmatched")
  @Roles("OWNER", "BURSAR", "VIEWER")
  unmatched(@Req() req: AuthedRequest) {
    return this.reconciliation.unmatchedPayments(req.session.schoolId);
  }

  @Get("audit/:paymentId")
  @Roles("OWNER", "BURSAR", "VIEWER")
  audit(@Req() req: AuthedRequest, @Param("paymentId") paymentId: string) {
    return this.reconciliation.auditTrail(req.session.schoolId, UuidSchema.parse(paymentId));
  }

  @Post("payments/:paymentId/reconcile")
  @HttpCode(200)
  @Roles("OWNER", "BURSAR")
  reconcile(@Req() req: AuthedRequest, @Param("paymentId") paymentId: string) {
    return this.reconciliation.reconcilePayment(
      req.session.schoolId,
      UuidSchema.parse(paymentId),
    );
  }

  @Post("matches/:matchId/confirm")
  @HttpCode(200)
  @Roles("OWNER", "BURSAR")
  async confirm(
    @Req() req: AuthedRequest,
    @Param("matchId") matchId: string,
  ): Promise<{ confirmed: true }> {
    await this.reconciliation.confirmMatch(
      req.session.schoolId,
      UuidSchema.parse(matchId),
      req.session.sub,
    );
    return { confirmed: true };
  }

  @Post("matches/:matchId/reject")
  @HttpCode(200)
  @Roles("OWNER", "BURSAR")
  async reject(
    @Req() req: AuthedRequest,
    @Param("matchId") matchId: string,
    @Body() body: unknown,
  ): Promise<{ rejected: true }> {
    const dto = RejectSchema.parse(body);
    await this.reconciliation.rejectMatch(
      req.session.schoolId,
      UuidSchema.parse(matchId),
      req.session.sub,
      dto.reason,
    );
    return { rejected: true };
  }
}
