import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { AuthenticationError } from "@soma/core";
import { GUARDIAN_TOKEN_SERVICE } from "./parent.tokens.js";
import type { GuardianTokenService } from "./guardian-token.service.js";

export interface GuardianRequest extends Request {
  guardian: { identityId: string };
}

/**
 * Parent session guard.
 *
 * Deliberately separate from the staff AuthGuard. A parent session carries no
 * schoolId and no role — authorization is by linkage to specific students, so
 * there is nothing a parent token could grant at a school-wide endpoint even
 * if one were reached.
 */
@Injectable()
export class GuardianGuard implements CanActivate {
  constructor(
    @Inject(GUARDIAN_TOKEN_SERVICE) private readonly tokens: GuardianTokenService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<GuardianRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new AuthenticationError();

    const claims = this.tokens.verify(header.slice("Bearer ".length));
    req.guardian = { identityId: claims.gid };
    return true;
  }
}
