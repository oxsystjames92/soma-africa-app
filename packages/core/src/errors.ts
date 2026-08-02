/** Typed domain errors — never leak internals to clients (CLAUDE.md §9). */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidMoneyError extends DomainError {
  readonly code = "INVALID_MONEY";
}

export class CurrencyMismatchError extends DomainError {
  readonly code = "CURRENCY_MISMATCH";
  constructor(a: string, b: string) {
    super(`Cannot operate across currencies: ${a} vs ${b}`);
  }
}

export class TenantIsolationError extends DomainError {
  readonly code = "TENANT_ISOLATION";
  constructor() {
    super("Cross-tenant access denied");
  }
}

export class AppendOnlyViolationError extends DomainError {
  readonly code = "APPEND_ONLY_VIOLATION";
  constructor(entity: string) {
    super(`${entity} is append-only: updates and deletes are forbidden`);
  }
}

export class AuthenticationError extends DomainError {
  readonly code = "AUTHENTICATION_FAILED";
  constructor() {
    // Deliberately unspecific — do not reveal which factor failed.
    super("Invalid credentials");
  }
}

export class AuthorizationError extends DomainError {
  readonly code = "FORBIDDEN";
  constructor() {
    super("Insufficient permissions");
  }
}
