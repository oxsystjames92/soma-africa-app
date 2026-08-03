import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import {
  ParentOtpRequestSchema,
  ParentOtpVerifySchema,
  ParentPaySchema,
  PayerProfileSchema,
  ReminderPreferenceSchema,
} from "@soma/contracts";
import type { RateLimiter } from "../payments/rate-limiter.js";
import { GuardianGuard, type GuardianRequest } from "./guardian.guard.js";
import type { GuardianAuthService } from "./guardian-auth.service.js";
import type { ParentService } from "./parent.service.js";
import type { PayerProfileService } from "./payer-profile.service.js";
import type { ReminderService } from "./reminder.service.js";
import {
  GUARDIAN_AUTH_SERVICE,
  PARENT_RATE_LIMITER,
  PARENT_SERVICE,
  PAYER_PROFILE_SERVICE,
  REMINDER_SERVICE,
} from "./parent.tokens.js";

const UuidSchema = z.string().uuid();
/** Soma references are opaque, so they may appear in a path (CLAUDE.md §8.2). */
const SomaRefSchema = z.string().regex(/^SOMA[0-9A-HJKMNP-TV-Z]{13}$/);

/**
 * Parent authentication. Unauthenticated and rate limited: a phone number is
 * the login handle, so this endpoint must not become an oracle for which
 * numbers belong to parents at which schools.
 */
@Controller("parent/auth")
export class ParentAuthController {
  constructor(
    @Inject(GUARDIAN_AUTH_SERVICE) private readonly auth: GuardianAuthService,
    @Inject(PARENT_RATE_LIMITER) private readonly limiter: RateLimiter,
  ) {}

  @Post("request-code")
  @HttpCode(202)
  async requestCode(@Body() body: unknown, @Req() req: Request): Promise<{ ok: true }> {
    const dto = ParentOtpRequestSchema.parse(body);
    await this.limiter.consume(`parent-otp:${req.ip ?? "unknown"}`);
    await this.auth.requestOtp(dto.phone);
    // Identical response whether or not the number is known.
    return { ok: true };
  }

  @Post("verify-code")
  @HttpCode(200)
  async verifyCode(@Body() body: unknown, @Req() req: Request) {
    const dto = ParentOtpVerifySchema.parse(body);
    await this.limiter.consume(`parent-verify:${req.ip ?? "unknown"}`);
    return this.auth.verifyOtp(dto.phone, dto.code);
  }
}

/**
 * The signed-in parent experience (CLAUDE.md §7 F11).
 *
 * Every route resolves the caller from their session and authorizes by
 * linkage to specific students. No path or query parameter ever carries a
 * name, phone, or school id.
 */
@Controller("parent")
@UseGuards(GuardianGuard)
export class ParentController {
  constructor(
    @Inject(PARENT_SERVICE) private readonly parent: ParentService,
    @Inject(PAYER_PROFILE_SERVICE) private readonly profiles: PayerProfileService,
    @Inject(REMINDER_SERVICE) private readonly reminders: ReminderService,
  ) {}

  @Get("children")
  children(@Req() req: GuardianRequest) {
    return this.parent.children(req.guardian.identityId);
  }

  @Get("children/:studentId/invoices")
  invoices(@Req() req: GuardianRequest, @Param("studentId") studentId: string) {
    return this.parent.invoicesFor(req.guardian.identityId, UuidSchema.parse(studentId));
  }

  @Get("payments")
  history(@Req() req: GuardianRequest) {
    return this.parent.paymentHistory(req.guardian.identityId);
  }

  @Get("receipts/:somaReference")
  receipt(@Req() req: GuardianRequest, @Param("somaReference") somaReference: string) {
    return this.parent.receipt(req.guardian.identityId, SomaRefSchema.parse(somaReference));
  }

  @Post("pay")
  @HttpCode(202)
  pay(@Req() req: GuardianRequest, @Body() body: unknown) {
    const dto = ParentPaySchema.parse(body);
    return this.parent.pay(
      req.guardian.identityId,
      dto.studentId,
      BigInt(dto.amountMinor),
      dto.payerPhone,
      dto.channel,
    );
  }

  @Get("payers")
  listPayers(@Req() req: GuardianRequest) {
    return this.profiles.list(req.guardian.identityId);
  }

  @Post("payers")
  @HttpCode(201)
  savePayer(@Req() req: GuardianRequest, @Body() body: unknown) {
    const dto = PayerProfileSchema.parse(body);
    return this.profiles.save(
      req.guardian.identityId,
      dto.label,
      dto.msisdn,
      dto.channel,
      dto.isDefault,
    );
  }

  @Delete("payers/:profileId")
  @HttpCode(204)
  async removePayer(
    @Req() req: GuardianRequest,
    @Param("profileId") profileId: string,
  ): Promise<void> {
    await this.profiles.remove(req.guardian.identityId, UuidSchema.parse(profileId));
  }

  @Get("reminders/preferences")
  preferences(@Req() req: GuardianRequest) {
    return this.reminders.preferences(req.guardian.identityId);
  }

  @Post("reminders/preferences")
  @HttpCode(200)
  async setPreference(@Req() req: GuardianRequest, @Body() body: unknown) {
    const dto = ReminderPreferenceSchema.parse(body);
    await this.reminders.setPreference(req.guardian.identityId, dto.channel, dto.enabled);
    return this.reminders.preferences(req.guardian.identityId);
  }

  /** One switch that stops every channel. */
  @Post("reminders/opt-out")
  @HttpCode(200)
  async optOut(@Req() req: GuardianRequest) {
    await this.reminders.optOutOfEverything(req.guardian.identityId);
    return this.reminders.preferences(req.guardian.identityId);
  }
}
