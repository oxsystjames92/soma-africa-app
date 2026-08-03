import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { z } from "zod";
import { AuthGuard, Roles, type AuthedRequest } from "../identity/auth.guard.js";
import { ALL_SCOPES, type ApiKeyService } from "./api-key.service.js";
import type { PublicApiService } from "./public-api.service.js";
import type { SandboxService } from "./sandbox.service.js";
import { API_KEY_SERVICE, PUBLIC_API_SERVICE, SANDBOX_SERVICE } from "./developer.tokens.js";
import { serialize } from "./serialize.js";

const IssueKeySchema = z.object({
  name: z.string().min(1).max(60),
  scopes: z.array(z.enum(ALL_SCOPES)).min(1),
});
const UuidSchema = z.string().uuid();

/**
 * In-portal developer settings (CLAUDE.md §7 F12).
 *
 * Staff-authenticated, not key-authenticated: minting a credential must
 * require a human session, or a leaked key could mint replacements for
 * itself and survive its own revocation. Restricted to OWNER — an API key is
 * a standing grant over a school's data.
 *
 * Excluded from the public OpenAPI spec: it is not part of the public API.
 */
@ApiExcludeController()
@Controller("portal/developer")
@UseGuards(AuthGuard)
export class PortalController {
  constructor(
    @Inject(API_KEY_SERVICE) private readonly keys: ApiKeyService,
    @Inject(SANDBOX_SERVICE) private readonly sandbox: SandboxService,
    @Inject(PUBLIC_API_SERVICE) private readonly api: PublicApiService,
  ) {}

  @Get("keys")
  @Roles("OWNER")
  keyList(@Req() req: AuthedRequest) {
    return this.keys.list(req.session.schoolId);
  }

  @Post("keys")
  @HttpCode(201)
  @Roles("OWNER")
  async issueKey(@Req() req: AuthedRequest, @Body() body: unknown) {
    const dto = IssueKeySchema.parse(body);
    // The plaintext appears in this response and nowhere else, ever.
    return this.keys.issue(req.session.schoolId, dto.name, dto.scopes, req.session.sub);
  }

  @Delete("keys/:id")
  @HttpCode(204)
  @Roles("OWNER")
  async revokeKey(@Req() req: AuthedRequest, @Param("id") id: string): Promise<void> {
    await this.keys.revoke(req.session.schoolId, UuidSchema.parse(id));
  }

  @Post("sandbox")
  @HttpCode(201)
  @Roles("OWNER")
  provisionSandbox(@Req() req: AuthedRequest) {
    return this.sandbox.provision(req.session.schoolId);
  }

  @Get("webhooks/deliveries")
  @Roles("OWNER", "BURSAR")
  async deliveries(@Req() req: AuthedRequest) {
    return serialize(await this.api.listDeliveries(req.session.schoolId, 50));
  }
}
