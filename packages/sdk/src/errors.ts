export class AgentsBayError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = "AgentsBayError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class AuthError extends AgentsBayError {
  constructor(message: string, details?: unknown) {
    super(message, 401, "UNAUTHORIZED", details);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends AgentsBayError {
  constructor(message: string, details?: unknown) {
    super(message, 403, "FORBIDDEN", details);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AgentsBayError {
  constructor(message: string, details?: unknown) {
    super(message, 404, "NOT_FOUND", details);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AgentsBayError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "BAD_REQUEST", details);
    this.name = "ValidationError";
  }
}

export class ConflictError extends AgentsBayError {
  constructor(message: string, details?: unknown) {
    super(message, 409, "CONFLICT", details);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AgentsBayError {
  retryAfter?: number;

  constructor(message: string, retryAfter?: number, details?: unknown) {
    super(message, 429, "RATE_LIMIT_EXCEEDED", details);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class ServerError extends AgentsBayError {
  constructor(message: string, status: number, details?: unknown) {
    super(message, status, "INTERNAL_ERROR", details);
    this.name = "ServerError";
  }
}
