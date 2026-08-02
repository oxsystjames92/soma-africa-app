import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import {
  AuthenticationError,
  AuthorizationError,
  DomainError,
  TenantIsolationError,
} from "@soma/core";

/** Maps typed domain errors to HTTP without leaking internals (CLAUDE.md §9). */
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const status =
      error instanceof AuthenticationError
        ? HttpStatus.UNAUTHORIZED
        : error instanceof AuthorizationError || error instanceof TenantIsolationError
          ? HttpStatus.FORBIDDEN
          : HttpStatus.UNPROCESSABLE_ENTITY;

    res.status(status).json({ code: error.code, message: error.message });
  }
}
