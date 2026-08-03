import jwt from "jsonwebtoken";
import { z } from "zod";
import { AuthenticationError } from "@soma/core";

/**
 * Parent sessions are signed with a distinct audience from staff sessions.
 *
 * Without it, a token minted for a parent would satisfy the staff guard's
 * signature check. The audience is what stops a parent token being replayed
 * against a bursar endpoint, since both are signed with the same secret.
 */
const PARENT_AUDIENCE = "soma:parent";

export const GuardianClaimsSchema = z.object({
  gid: z.string(),
  aud: z.literal(PARENT_AUDIENCE),
});
export type GuardianClaims = z.infer<typeof GuardianClaimsSchema>;

export class GuardianTokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresInSeconds: number,
  ) {}

  get ttlSeconds(): number {
    return this.expiresInSeconds;
  }

  sign(claims: { gid: string }): string {
    return jwt.sign({ gid: claims.gid }, this.secret, {
      algorithm: "HS256",
      audience: PARENT_AUDIENCE,
      expiresIn: this.expiresInSeconds,
    });
  }

  verify(token: string): GuardianClaims {
    try {
      const payload = jwt.verify(token, this.secret, {
        algorithms: ["HS256"],
        audience: PARENT_AUDIENCE,
      });
      return GuardianClaimsSchema.parse(payload);
    } catch {
      throw new AuthenticationError();
    }
  }
}
