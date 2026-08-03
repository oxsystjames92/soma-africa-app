import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { ApiKeyInvalidError, type AuthenticatedKey, type Scope } from "./api-key.service.js";
import type { ApiKeyService } from "./api-key.service.js";
import { API_KEY_SERVICE } from "./developer.tokens.js";

export interface ApiKeyRequest extends Request {
  apiKey: AuthenticatedKey;
}

export const SCOPES_KEY = "soma:scopes";
/** Declare the scopes a route needs. A route with none is a bug, not a default. */
export const RequireScopes = (...scopes: Scope[]) => SetMetadata(SCOPES_KEY, scopes);

/**
 * Public API authentication.
 *
 * The key travels in `Authorization: Bearer` — never a query string
 * (CLAUDE.md §8.2). URLs leak into browser history, proxy logs, and Referer
 * headers, so a key in one is a key already disclosed.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Inject(API_KEY_SERVICE) private readonly keys: ApiKeyService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ApiKeyRequest>();

    // Refuse outright if a key was put somewhere it can leak, rather than
    // quietly accepting it.
    if (typeof req.query?.["api_key"] === "string" || typeof req.query?.["key"] === "string") {
      throw new ApiKeyInvalidError();
    }

    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new ApiKeyInvalidError();

    const key = await this.keys.authenticate(header.slice("Bearer ".length).trim());
    req.apiKey = key;

    const required = this.reflector.getAllAndOverride<Scope[] | undefined>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    for (const scope of required ?? []) {
      this.keys.assertScope(key, scope);
    }
    return true;
  }
}
