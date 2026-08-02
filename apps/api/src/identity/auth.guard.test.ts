import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import type { Role } from "@soma/contracts";
import { AuthenticationError, AuthorizationError } from "@soma/core";
import { AuthGuard, ROLES_KEY } from "./auth.guard.js";
import { TokenService } from "./token.service.js";

const tokens = new TokenService("test-secret-at-least-32-characters!!", 900);
// The real Reflector — the guard's metadata lookup is part of what we test.
const guard = new AuthGuard(tokens, new Reflector());

function contextFor(authorization?: string, requiredRoles?: Role[]): ExecutionContext {
  const req: Record<string, unknown> = { headers: { authorization } };
  const handler = (): void => {};
  if (requiredRoles) Reflect.defineMetadata(ROLES_KEY, requiredRoles, handler);

  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => handler,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

describe("AuthGuard", () => {
  const bursarToken = tokens.sign({ sub: "u1", schoolId: "school-a", role: "BURSAR" });

  it("rejects a missing or malformed Authorization header", () => {
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(AuthenticationError);
    expect(() => guard.canActivate(contextFor("Basic abc"))).toThrow(AuthenticationError);
  });

  it("accepts a valid bearer token and attaches session claims", () => {
    const ctx = contextFor(`Bearer ${bursarToken}`);
    expect(guard.canActivate(ctx)).toBe(true);
    const req = ctx.switchToHttp().getRequest<{ session: { schoolId: string } }>();
    expect(req.session.schoolId).toBe("school-a");
  });

  it("enforces role restrictions (RBAC)", () => {
    expect(guard.canActivate(contextFor(`Bearer ${bursarToken}`, ["BURSAR", "OWNER"]))).toBe(true);
    expect(() => guard.canActivate(contextFor(`Bearer ${bursarToken}`, ["OWNER"]))).toThrow(
      AuthorizationError,
    );
  });
});
