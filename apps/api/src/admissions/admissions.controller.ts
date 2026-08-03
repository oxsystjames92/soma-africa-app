import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import { AuthGuard, Roles, type AuthedRequest } from "../identity/auth.guard.js";
import type { RateLimiter } from "../payments/rate-limiter.js";
import type { AdmissionsService } from "./admissions.service.js";
import { ADMISSIONS_RATE_LIMITER, ADMISSIONS_SERVICE } from "./admissions.tokens.js";

const PhoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Enter the number in international format, e.g. +256700123456");
const ReferenceSchema = z.string().regex(/^APP-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
const UuidSchema = z.string().uuid();

const SubmitSchema = z.object({
  schoolId: z.string().uuid(),
  applicantFirst: z.string().min(1).max(60),
  applicantLast: z.string().min(1).max(60),
  dateOfBirth: z.coerce.date().optional(),
  appliedFor: z.string().min(1).max(40),
  guardianName: z.string().min(1).max(80),
  guardianPhone: PhoneSchema,
  guardianEmail: z.string().email().optional(),
});

const RequestCodeSchema = z.object({ reference: ReferenceSchema, phone: PhoneSchema });
const CheckStatusSchema = RequestCodeSchema.extend({ code: z.string().regex(/^\d{6}$/) });
const TransitionSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "OFFERED", "ACCEPTED", "REJECTED", "WITHDRAWN"]),
  note: z.string().max(500).optional(),
});

/**
 * Public admissions (CLAUDE.md §7 F13).
 *
 * Unauthenticated by necessity — an applicant has no account — so it is rate
 * limited and returns nothing that would let references be discovered.
 */
@Controller("public/admissions")
export class PublicAdmissionsController {
  constructor(
    @Inject(ADMISSIONS_SERVICE) private readonly admissions: AdmissionsService,
    @Inject(ADMISSIONS_RATE_LIMITER) private readonly limiter: RateLimiter,
  ) {}

  @Post("apply")
  @HttpCode(201)
  async apply(@Body() body: unknown, @Req() req: Request) {
    const dto = SubmitSchema.parse(body);
    await this.limiter.consume(`apply:${req.ip ?? "unknown"}`);
    // The reference is the receipt. It is shown once and must be kept.
    return this.admissions.submit(dto);
  }

  @Post("request-code")
  @HttpCode(202)
  async requestCode(@Body() body: unknown, @Req() req: Request): Promise<{ ok: true }> {
    const dto = RequestCodeSchema.parse(body);
    await this.limiter.consume(`admissions-otp:${req.ip ?? "unknown"}`);
    await this.admissions.requestStatusCode(dto.reference, dto.phone);
    // Same answer whether or not the reference exists.
    return { ok: true };
  }

  @Post("status")
  @HttpCode(200)
  async status(@Body() body: unknown, @Req() req: Request) {
    const dto = CheckStatusSchema.parse(body);
    await this.limiter.consume(`admissions-status:${req.ip ?? "unknown"}`);
    return this.admissions.checkStatus(dto.reference, dto.phone, dto.code);
  }
}

/** The admissions officer's side. */
@Controller("admissions")
@UseGuards(AuthGuard)
export class AdmissionsController {
  constructor(@Inject(ADMISSIONS_SERVICE) private readonly admissions: AdmissionsService) {}

  @Get()
  @Roles("OWNER", "BURSAR", "VIEWER")
  list(@Req() req: AuthedRequest, @Query("status") status?: string) {
    return this.admissions.list(req.session.schoolId, status);
  }

  @Post(":id/transition")
  @HttpCode(200)
  @Roles("OWNER", "BURSAR")
  transition(@Req() req: AuthedRequest, @Param("id") id: string, @Body() body: unknown) {
    const dto = TransitionSchema.parse(body);
    return this.admissions.transition(
      req.session.schoolId,
      UuidSchema.parse(id),
      dto.status,
      req.session.sub,
      dto.note,
    );
  }

  @Post(":id/enrol")
  @HttpCode(201)
  @Roles("OWNER", "BURSAR")
  enrol(@Req() req: AuthedRequest, @Param("id") id: string) {
    return this.admissions.enrol(req.session.schoolId, UuidSchema.parse(id), req.session.sub);
  }
}
