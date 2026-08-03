import { Body, Controller, HttpCode, Inject, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import {
  PaymentConfirmSchema,
  PaymentLookupSchema,
  type PaymentConfirmResponse,
  type PaymentLookupResponse,
} from "@soma/contracts";
import { PaymentsService } from "./payments.service.js";
import { PAYMENTS_SERVICE, RATE_LIMITER } from "./payments.tokens.js";
import type { RateLimiter } from "./rate-limiter.js";

/**
 * The two-step payer flow (CLAUDE.md §7 F4). Unauthenticated by necessity —
 * a parent paying fees has no Soma account — so it is the most exposed
 * surface in the system and is written to give away nothing:
 *
 *  - no student name, school, or balance in any response (§8.1)
 *  - rate limited, so payment codes cannot be enumerated
 *  - the intent token is opaque and single-use
 */
@Controller("public/payments")
export class PublicPaymentsController {
  constructor(
    @Inject(PAYMENTS_SERVICE) private readonly payments: PaymentsService,
    @Inject(RATE_LIMITER) private readonly limiter: RateLimiter,
  ) {}

  @Post("lookup")
  @HttpCode(200)
  async lookup(@Body() body: unknown, @Req() req: Request): Promise<PaymentLookupResponse> {
    const dto = PaymentLookupSchema.parse(body);
    await this.limiter.consume(`lookup:${req.ip ?? "unknown"}`);
    return this.payments.lookup(dto.schoolId, dto.paymentCode);
  }

  @Post("confirm")
  @HttpCode(202)
  async confirm(@Body() body: unknown, @Req() req: Request): Promise<PaymentConfirmResponse> {
    const dto = PaymentConfirmSchema.parse(body);
    await this.limiter.consume(`confirm:${req.ip ?? "unknown"}`);
    return this.payments.confirm(
      dto.intentToken,
      BigInt(dto.amountMinor),
      dto.payerPhone,
      dto.channel,
    );
  }
}
