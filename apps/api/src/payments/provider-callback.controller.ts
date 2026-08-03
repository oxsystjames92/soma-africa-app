import {
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import type { PaymentProviderAdapter } from "@soma/adapters";
import { PaymentsService } from "./payments.service.js";
import { PAYMENT_ADAPTERS, PAYMENTS_SERVICE } from "./payments.tokens.js";

/**
 * Inbound rail callbacks.
 *
 * Two rules hold here. The signature is checked against the RAW body before
 * anything is parsed — verifying a re-serialized object would let an attacker
 * exploit the gap between the bytes we authenticated and the bytes we act on.
 * And an unverified callback is refused outright, never "processed anyway".
 */
@Controller("providers")
export class ProviderCallbackController {
  constructor(
    @Inject(PAYMENTS_SERVICE) private readonly payments: PaymentsService,
    @Inject(PAYMENT_ADAPTERS) private readonly adapters: Map<string, PaymentProviderAdapter>,
  ) {}

  @Post(":provider/callback")
  @HttpCode(200)
  async callback(
    @Param("provider") provider: string,
    @Headers("x-soma-provider-signature") signature: string | undefined,
    @Req() req: Request & { rawBody?: Buffer },
  ): Promise<{ received: true }> {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new NotFoundException();

    const raw = req.rawBody?.toString("utf8") ?? "";
    if (!signature || !adapter.verifyInboundSignature(raw, signature)) {
      throw new ForbiddenException();
    }

    await this.payments.handleCallback(provider, raw);
    // Always 200 on a verified callback: rails retry on anything else, and a
    // duplicate is already a no-op.
    return { received: true };
  }
}
