import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { z } from "zod";
import { ApiKeyGuard, RequireScopes, type ApiKeyRequest } from "./api-key.guard.js";
import { IdempotencyService } from "./idempotency.service.js";
import type { PublicApiService } from "./public-api.service.js";
import type { SandboxService } from "./sandbox.service.js";
import {
  IDEMPOTENCY_SERVICE,
  PUBLIC_API_SERVICE,
  SANDBOX_SERVICE,
} from "./developer.tokens.js";
import { serialize } from "./serialize.js";

const LimitSchema = z.coerce.number().int().min(1).max(100).default(25);
const CursorSchema = z.string().uuid().optional();
const UuidSchema = z.string().uuid();
const SomaRefSchema = z.string().regex(/^SOMA[0-9A-HJKMNP-TV-Z]{13}$/);

const CreateEndpointSchema = z.object({ url: z.string().url() });
const SimulatePaymentSchema = z.object({
  studentId: z.string().uuid().optional(),
  amountMinor: z.string().regex(/^\d+$/),
  outcome: z.enum(["succeeded", "failed"]).default("succeeded"),
});

/**
 * Soma public API, v1.
 *
 * Authenticated with a scoped API key in an Authorization header. The key
 * determines both the tenant and whether the caller is in live or sandbox
 * data — a test key is issued against a TEST-mode school, so the isolation is
 * the same tenant boundary the rest of the system enforces.
 */
@ApiTags("v1")
@ApiBearerAuth()
@Controller("v1")
@UseGuards(ApiKeyGuard)
export class PublicApiController {
  constructor(
    @Inject(PUBLIC_API_SERVICE) private readonly api: PublicApiService,
    @Inject(SANDBOX_SERVICE) private readonly sandbox: SandboxService,
    @Inject(IDEMPOTENCY_SERVICE) private readonly idempotency: IdempotencyService,
  ) {}

  @Get("students")
  @RequireScopes("students:read")
  @ApiOperation({ summary: "List students", description: "Cursor-paginated. Pass nextCursor as `cursor`." })
  async students(
    @Req() req: ApiKeyRequest,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ) {
    return serialize(
      await this.api.listStudents(
        req.apiKey.schoolId,
        LimitSchema.parse(limit),
        CursorSchema.parse(cursor),
      ),
    );
  }

  @Get("students/:id")
  @RequireScopes("students:read")
  @ApiOperation({ summary: "Retrieve a student" })
  async student(@Req() req: ApiKeyRequest, @Param("id") id: string) {
    return serialize(await this.api.getStudent(req.apiKey.schoolId, UuidSchema.parse(id)));
  }

  @Get("invoices")
  @RequireScopes("invoices:read")
  @ApiOperation({ summary: "List invoices", description: "Filter by `studentId` to get one child's bills." })
  async invoices(
    @Req() req: ApiKeyRequest,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
    @Query("studentId") studentId?: string,
  ) {
    return serialize(
      await this.api.listInvoices(
        req.apiKey.schoolId,
        LimitSchema.parse(limit),
        CursorSchema.parse(cursor),
        studentId ? UuidSchema.parse(studentId) : undefined,
      ),
    );
  }

  @Get("payments")
  @RequireScopes("payments:read")
  @ApiOperation({ summary: "List payments" })
  async payments(
    @Req() req: ApiKeyRequest,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
  ) {
    return serialize(
      await this.api.listPayments(
        req.apiKey.schoolId,
        LimitSchema.parse(limit),
        CursorSchema.parse(cursor),
      ),
    );
  }

  @Get("payments/:somaReference")
  @RequireScopes("payments:read")
  @ApiOperation({ summary: "Retrieve a payment by Soma reference" })
  async payment(@Req() req: ApiKeyRequest, @Param("somaReference") somaReference: string) {
    return serialize(
      await this.api.getPayment(req.apiKey.schoolId, SomaRefSchema.parse(somaReference)),
    );
  }

  // ── webhooks ─────────────────────────────────────────────────────────────

  @Get("webhooks/endpoints")
  @RequireScopes("webhooks:read")
  @ApiOperation({ summary: "List webhook endpoints" })
  async endpoints(@Req() req: ApiKeyRequest) {
    return serialize(await this.api.listEndpoints(req.apiKey.schoolId));
  }

  @Post("webhooks/endpoints")
  @HttpCode(201)
  @RequireScopes("webhooks:write")
  @ApiOperation({
    summary: "Register a webhook endpoint",
    description: "The signing secret is returned once and never again. Store it before you close the response.",
  })
  async createEndpoint(@Req() req: ApiKeyRequest, @Body() body: unknown) {
    const dto = CreateEndpointSchema.parse(body);
    return serialize(await this.api.createEndpoint(req.apiKey.schoolId, dto.url));
  }

  @Delete("webhooks/endpoints/:id")
  @HttpCode(204)
  @RequireScopes("webhooks:write")
  @ApiOperation({ summary: "Delete a webhook endpoint" })
  async deleteEndpoint(@Req() req: ApiKeyRequest, @Param("id") id: string): Promise<void> {
    await this.api.deleteEndpoint(req.apiKey.schoolId, UuidSchema.parse(id));
  }

  @Get("webhooks/deliveries")
  @RequireScopes("webhooks:read")
  @ApiOperation({
    summary: "List webhook deliveries",
    description: "Attempt counts and the last error, so a failing integration can be diagnosed without contacting support.",
  })
  async deliveries(
    @Req() req: ApiKeyRequest,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
    @Query("status") status?: string,
  ) {
    return serialize(
      await this.api.listDeliveries(
        req.apiKey.schoolId,
        LimitSchema.parse(limit),
        CursorSchema.parse(cursor),
        status,
      ),
    );
  }

  // ── sandbox ──────────────────────────────────────────────────────────────

  @Post("sandbox/simulate/payment")
  @HttpCode(201)
  @RequireScopes("payments:write")
  @ApiOperation({
    summary: "Simulate a payment (test keys only)",
    description:
      "Creates a pending payment without touching a rail so you can drive your own webhook handler. Refused for live keys.",
  })
  async simulate(
    @Req() req: ApiKeyRequest,
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    const dto = SimulatePaymentSchema.parse(body);
    const endpoint = "POST /v1/sandbox/simulate/payment";

    if (idempotencyKey) {
      const replayed = await this.idempotency.lookup(
        req.apiKey.schoolId,
        idempotencyKey,
        endpoint,
        body,
      );
      if (replayed) return replayed.body;
    }

    const result = serialize(
      await this.sandbox.simulatePayment(req.apiKey.schoolId, req.apiKey.mode, {
        ...(dto.studentId ? { studentId: dto.studentId } : {}),
        amountMinor: BigInt(dto.amountMinor),
        outcome: dto.outcome,
      }),
    );

    if (idempotencyKey) {
      await this.idempotency.remember(
        req.apiKey.schoolId,
        idempotencyKey,
        endpoint,
        body,
        201,
        result,
      );
    }
    return result;
  }
}
