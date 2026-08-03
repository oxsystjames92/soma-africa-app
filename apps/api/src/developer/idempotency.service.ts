import { createHash } from "node:crypto";
import { DomainError } from "@soma/core";
import type { SomaPrismaClient } from "@soma/db";

export class IdempotencyKeyReusedError extends DomainError {
  readonly code = "IDEMPOTENCY_KEY_REUSED";
  constructor() {
    super("This Idempotency-Key was already used with a different request body");
  }
}

export interface ReplayedResponse {
  status: number;
  body: unknown;
}

/**
 * Idempotent writes for the public API (CLAUDE.md §8.4).
 *
 * A client that times out and retries must not create a second payment. The
 * first response is stored and replayed verbatim, so the retry is
 * indistinguishable from the original success.
 */
export class IdempotencyService {
  constructor(private readonly prisma: SomaPrismaClient) {}

  static hashBody(body: unknown): string {
    return createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");
  }

  /**
   * Returns the stored response when this exact request was already handled.
   * Throws when the key is reused with a different body — that is a client
   * bug, and answering it would hide a real problem.
   */
  async lookup(
    schoolId: string,
    key: string,
    endpoint: string,
    body: unknown,
  ): Promise<ReplayedResponse | null> {
    const existing = await this.prisma.idempotencyRecord.findUnique({
      where: { schoolId_key: { schoolId, key } },
    });
    if (!existing) return null;

    if (existing.endpoint !== endpoint || existing.requestHash !== IdempotencyService.hashBody(body)) {
      throw new IdempotencyKeyReusedError();
    }
    return { status: existing.responseStatus, body: existing.responseBody };
  }

  async remember(
    schoolId: string,
    key: string,
    endpoint: string,
    body: unknown,
    status: number,
    response: unknown,
  ): Promise<void> {
    await this.prisma.idempotencyRecord.create({
      data: {
        schoolId,
        key,
        endpoint,
        requestHash: IdempotencyService.hashBody(body),
        responseStatus: status,
        responseBody: response as object,
      },
    });
  }
}
