import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { WebhookReplaySchema } from "@soma/contracts";
import { AuthGuard, Roles, type AuthedRequest } from "../identity/auth.guard.js";
import { PaymentsService } from "./payments.service.js";
import { PAYMENTS_SERVICE, WEBHOOK_DELIVERY_SERVICE } from "./payments.tokens.js";
import type { WebhookDeliveryService } from "./webhook-delivery.service.js";

/**
 * Webhook operations for a school's own staff (CLAUDE.md §8.5).
 * Every route is tenant-scoped by the verified session — never by request input.
 */
@Controller("webhooks")
@UseGuards(AuthGuard)
export class WebhooksController {
  constructor(
    @Inject(WEBHOOK_DELIVERY_SERVICE) private readonly deliveries: WebhookDeliveryService,
    @Inject(PAYMENTS_SERVICE) private readonly payments: PaymentsService,
  ) {}

  /** Requeue a delivery the receiver missed or dropped. */
  @Post("replay")
  @HttpCode(202)
  @Roles("OWNER", "BURSAR")
  async replay(@Body() body: unknown, @Req() req: AuthedRequest): Promise<{ queued: true }> {
    const dto = WebhookReplaySchema.parse(body);
    await this.deliveries.replay(dto.deliveryId, req.session.schoolId);
    return { queued: true };
  }

  /**
   * Reconcile a payment whose callback never arrived by asking the rail
   * directly. The safety net for a provider that drops an event.
   */
  @Get("reconcile/:somaRef")
  @Roles("OWNER", "BURSAR")
  async reconcile(
    @Param("somaRef") somaRef: string,
    @Req() req: AuthedRequest,
  ): Promise<{ somaReference: string; status: string }> {
    const status = await this.payments.refreshStatus(req.session.schoolId, somaRef);
    return { somaReference: somaRef, status };
  }
}
