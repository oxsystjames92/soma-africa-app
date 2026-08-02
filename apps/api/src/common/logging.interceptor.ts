import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable, tap } from "rxjs";
import { redact } from "./redact.js";

/** Structured request logging with PII redaction. Never logs bodies raw. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("http");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const started = Date.now();
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap({
        finalize: () => {
          this.logger.log(
            JSON.stringify({
              method: req.method,
              path: req.path,
              status: res.statusCode,
              durationMs: Date.now() - started,
              body: redact(req.body),
            }),
          );
        },
      }),
    );
  }
}
