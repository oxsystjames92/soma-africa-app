import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { DomainError } from "@soma/core";
import type { SomaPrismaClient } from "@soma/db";

export class ApiKeyInvalidError extends DomainError {
  readonly code = "API_KEY_INVALID";
  constructor() {
    // Never distinguish unknown, revoked, and malformed — each answer is a
    // hint to someone probing.
    super("Invalid API key");
  }
}

export class InsufficientScopeError extends DomainError {
  readonly code = "INSUFFICIENT_SCOPE";
  constructor(required: string) {
    super(`This key is missing the "${required}" scope`);
  }
}

export type KeyMode = "LIVE" | "TEST";

/** Least-privilege scopes. A key holds a subset; wildcards are not accepted. */
export const ALL_SCOPES = [
  "students:read",
  "students:write",
  "invoices:read",
  "invoices:write",
  "payments:read",
  "payments:write",
  "webhooks:read",
  "webhooks:write",
] as const;
export type Scope = (typeof ALL_SCOPES)[number];

export interface AuthenticatedKey {
  keyId: string;
  schoolId: string;
  mode: KeyMode;
  scopes: string[];
}

/** `sk_live_` / `sk_test_` so a leaked key is identifiable on sight. */
function prefixFor(mode: KeyMode): string {
  return mode === "LIVE" ? "sk_live_" : "sk_test_";
}

function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export class ApiKeyService {
  constructor(
    private readonly prisma: SomaPrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Mint a key. The plaintext is returned exactly once and never stored —
   * losing it means rotating, not recovering.
   */
  async issue(
    schoolId: string,
    name: string,
    scopes: Scope[],
    createdBy: string,
  ): Promise<{ id: string; key: string; prefix: string; scopes: string[]; mode: KeyMode }> {
    const school = await this.prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
      select: { mode: true },
    });
    const mode = school.mode as KeyMode;

    // 256 bits of CSPRNG output: no dictionary exists to walk.
    const secret = randomBytes(32).toString("base64url");
    const handle = randomBytes(4).toString("hex");
    const prefix = `${prefixFor(mode)}${handle}`;
    const plaintext = `${prefix}_${secret}`;

    const record = await this.prisma.apiKey.create({
      data: {
        schoolId,
        name,
        mode,
        prefix,
        hash: hashKey(plaintext),
        scopes,
        createdBy,
      },
      select: { id: true },
    });

    return { id: record.id, key: plaintext, prefix, scopes, mode };
  }

  /**
   * Resolve a presented key.
   *
   * The prefix gives an indexed lookup; the comparison is constant time so a
   * timing signal cannot be used to recover the secret byte by byte.
   */
  async authenticate(presented: string): Promise<AuthenticatedKey> {
    const prefix = presented.split("_").slice(0, 3).join("_");
    if (!prefix.startsWith("sk_live_") && !prefix.startsWith("sk_test_")) {
      throw new ApiKeyInvalidError();
    }

    const record = await this.prisma.apiKey.findUnique({ where: { prefix } });
    if (!record || record.revokedAt) throw new ApiKeyInvalidError();

    const expected = Buffer.from(record.hash, "hex");
    const actual = Buffer.from(hashKey(presented), "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new ApiKeyInvalidError();
    }

    // Best-effort usage stamp; never block a request on it.
    void this.prisma.apiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: this.now() } })
      .catch(() => undefined);

    return {
      keyId: record.id,
      schoolId: record.schoolId,
      mode: record.mode as KeyMode,
      scopes: record.scopes,
    };
  }

  assertScope(key: AuthenticatedKey, required: Scope): void {
    if (!key.scopes.includes(required)) throw new InsufficientScopeError(required);
  }

  /** Keys a school can see: metadata only, never the secret. */
  list(schoolId: string) {
    return this.prisma.apiKey.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        mode: true,
        prefix: true,
        scopes: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
  }

  /** Revocation is immediate and irreversible. */
  async revoke(schoolId: string, keyId: string): Promise<void> {
    await this.prisma.apiKey.updateMany({
      where: { id: keyId, schoolId, revokedAt: null },
      data: { revokedAt: this.now() },
    });
  }
}
