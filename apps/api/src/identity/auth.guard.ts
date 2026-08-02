import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import type { Role, SessionClaims } from "@soma/contracts";
import { AuthenticationError, AuthorizationError } from "@soma/core";
import { TOKEN_SERVICE } from "./identity.tokens.js";
import { TokenService } from "./token.service.js";

export interface AuthedRequest extends Request {
  session: SessionClaims;
}

export const ROLES_KEY = "soma:roles";
/** Restrict a route to specific roles. Without it, any authenticated user passes. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Bearer-token guard. Credentials live in the Authorization header ONLY —
 * never in URLs (CLAUDE.md §8.2). Populates req.session with verified claims;
 * every downstream data access is tenant-scoped by session.schoolId.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new AuthenticationError();

    req.session = this.tokens.verify(header.slice("Bearer ".length));

    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required && !required.includes(req.session.role)) {
      throw new AuthorizationError();
    }
    return true;
  }
}
