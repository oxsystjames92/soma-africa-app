import jwt from "jsonwebtoken";
import { SessionClaims, SessionClaimsSchema } from "@soma/contracts";
import { AuthenticationError } from "@soma/core";

/** Short-lived HS256 sessions (CLAUDE.md §5). Secrets from env only. */
export class TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresInSeconds: number,
  ) {}

  get ttlSeconds(): number {
    return this.expiresInSeconds;
  }

  sign(claims: SessionClaims): string {
    return jwt.sign(claims, this.secret, {
      algorithm: "HS256",
      expiresIn: this.expiresInSeconds,
    });
  }

  verify(token: string): SessionClaims {
    try {
      const payload = jwt.verify(token, this.secret, { algorithms: ["HS256"] });
      return SessionClaimsSchema.parse(payload);
    } catch {
      throw new AuthenticationError();
    }
  }
}
