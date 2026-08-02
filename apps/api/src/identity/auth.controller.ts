import { Body, Controller, Get, HttpCode, Inject, Post, Req, UseGuards } from "@nestjs/common";
import {
  LoginRequestSchema,
  OtpRequestSchema,
  OtpVerifySchema,
  SessionResponse,
} from "@soma/contracts";
import { AuthService } from "./auth.service.js";
import { AuthGuard, AuthedRequest } from "./auth.guard.js";
import { AUTH_SERVICE } from "./identity.tokens.js";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AUTH_SERVICE) private readonly auth: AuthService) {}

  @Post("login")
  @HttpCode(200)
  login(@Body() body: unknown): Promise<SessionResponse> {
    const dto = LoginRequestSchema.parse(body);
    return this.auth.login(dto.schoolId, dto.email, dto.password);
  }

  @Post("otp/request")
  @HttpCode(202)
  async requestOtp(@Body() body: unknown): Promise<{ ok: true }> {
    const dto = OtpRequestSchema.parse(body);
    await this.auth.requestOtp(dto.schoolId, dto.email);
    // Uniform response — never reveals whether the account exists.
    return { ok: true };
  }

  @Post("otp/verify")
  @HttpCode(200)
  verifyOtp(@Body() body: unknown): Promise<SessionResponse> {
    const dto = OtpVerifySchema.parse(body);
    return this.auth.verifyOtp(dto.schoolId, dto.email, dto.code);
  }

  /** Returns the caller's own session claims — no PII beyond ids. */
  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() req: AuthedRequest): { sub: string; schoolId: string; role: string } {
    return req.session;
  }
}
