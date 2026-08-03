import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, Roles, type AuthedRequest } from "../identity/auth.guard.js";
import { serialize } from "../developer/serialize.js";
import { WALLET_SERVICE } from "./wallet.tokens.js";
import type { WalletService } from "./wallet.service.js";

const UuidSchema = z.string().uuid();
const AmountSchema = z
  .string()
  .regex(/^\d+$/)
  .refine((v) => BigInt(v) > 0n, "Amount must be greater than zero");

const MoveSchema = z.object({
  amountMinor: AmountSchema,
  reference: z.string().max(80).optional(),
  note: z.string().max(200).optional(),
});
const StatusSchema = z.object({ status: z.enum(["ACTIVE", "FROZEN", "CLOSED"]) });

/**
 * Pocket-money wallets (CLAUDE.md §7 F14).
 *
 * Moving money out of a child's wallet is restricted to OWNER and BURSAR.
 * A TEACHER can hold a class register but must not be able to cash out a
 * student's pocket money.
 */
@Controller("wallets")
@UseGuards(AuthGuard)
export class WalletController {
  constructor(@Inject(WALLET_SERVICE) private readonly wallets: WalletService) {}

  @Post(":studentId/open")
  @HttpCode(201)
  @Roles("OWNER", "BURSAR")
  async open(@Req() req: AuthedRequest, @Param("studentId") studentId: string) {
    return serialize(await this.wallets.openFor(req.session.schoolId, UuidSchema.parse(studentId)));
  }

  @Get(":studentId")
  @Roles("OWNER", "BURSAR", "VIEWER")
  async balance(@Req() req: AuthedRequest, @Param("studentId") studentId: string) {
    return serialize(await this.wallets.balance(req.session.schoolId, UuidSchema.parse(studentId)));
  }

  @Get(":studentId/statement")
  @Roles("OWNER", "BURSAR", "VIEWER")
  async statement(@Req() req: AuthedRequest, @Param("studentId") studentId: string) {
    return serialize(
      await this.wallets.statement(req.session.schoolId, UuidSchema.parse(studentId)),
    );
  }

  @Post(":studentId/deposit")
  @HttpCode(201)
  @Roles("OWNER", "BURSAR")
  async deposit(
    @Req() req: AuthedRequest,
    @Param("studentId") studentId: string,
    @Body() body: unknown,
  ) {
    const dto = MoveSchema.parse(body);
    return serialize(
      await this.wallets.deposit({
        schoolId: req.session.schoolId,
        studentId: UuidSchema.parse(studentId),
        amountMinor: BigInt(dto.amountMinor),
        actorId: req.session.sub,
        ...(dto.reference ? { reference: dto.reference } : {}),
        ...(dto.note ? { note: dto.note } : {}),
      }),
    );
  }

  @Post(":studentId/withdraw")
  @HttpCode(201)
  @Roles("OWNER", "BURSAR")
  async withdraw(
    @Req() req: AuthedRequest,
    @Param("studentId") studentId: string,
    @Body() body: unknown,
  ) {
    const dto = MoveSchema.parse(body);
    return serialize(
      await this.wallets.withdraw({
        schoolId: req.session.schoolId,
        studentId: UuidSchema.parse(studentId),
        amountMinor: BigInt(dto.amountMinor),
        actorId: req.session.sub,
        ...(dto.reference ? { reference: dto.reference } : {}),
        ...(dto.note ? { note: dto.note } : {}),
      }),
    );
  }

  @Post(":studentId/cashout")
  @HttpCode(201)
  @Roles("OWNER", "BURSAR")
  async cashout(
    @Req() req: AuthedRequest,
    @Param("studentId") studentId: string,
    @Body() body: unknown,
  ) {
    const dto = MoveSchema.parse(body);
    return serialize(
      await this.wallets.cashout({
        schoolId: req.session.schoolId,
        studentId: UuidSchema.parse(studentId),
        amountMinor: BigInt(dto.amountMinor),
        actorId: req.session.sub,
        ...(dto.note ? { note: dto.note } : {}),
      }),
    );
  }

  @Post(":studentId/status")
  @HttpCode(200)
  @Roles("OWNER")
  async setStatus(
    @Req() req: AuthedRequest,
    @Param("studentId") studentId: string,
    @Body() body: unknown,
  ): Promise<{ status: string }> {
    const dto = StatusSchema.parse(body);
    await this.wallets.setStatus(req.session.schoolId, UuidSchema.parse(studentId), dto.status);
    return { status: dto.status };
  }
}
