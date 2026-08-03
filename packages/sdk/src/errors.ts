/** Typed errors, so callers can branch on cause rather than parse messages. */
export class SomaError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** The key is unknown, revoked, or absent. */
export class AuthenticationError extends SomaError {}

/** The key is valid but lacks the scope this call needs. */
export class PermissionError extends SomaError {}

export class NotFoundError extends SomaError {}

/** Input failed validation. Fix the request; retrying will not help. */
export class ValidationError extends SomaError {}

/** Soma had a problem. Safe to retry — the SDK already did, with backoff. */
export class ServerError extends SomaError {}

export function errorFor(status: number, code: string, message: string): SomaError {
  if (status === 401) return new AuthenticationError(status, code, message);
  if (status === 403) return new PermissionError(status, code, message);
  if (status === 404) return new NotFoundError(status, code, message);
  if (status >= 500) return new ServerError(status, code, message);
  return new ValidationError(status, code, message);
}
