// Custom error classes for AgentBay
import * as Sentry from "@sentry/nextjs"

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 400, "VALIDATION_ERROR")
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, "NOT_FOUND")
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED")
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403, "FORBIDDEN")
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT")
  }
}

export class RateLimitError extends AppError {
  public details?: Record<string, unknown>

  constructor(message: string = "Too many requests", details?: Record<string, unknown>) {
    super(message, 429, "RATE_LIMIT_EXCEEDED")
    this.details = details
  }
}

// Agent-specific errors
export class AgentError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 400, code || "AGENT_ERROR")
  }
}

/**
 * Error thrown when an agent action requires human approval
 * @planned Phase 2+ - Agent approval workflows
 * @example throw new ApprovalRequiredError("create_listing", "Price exceeds $1000")
 */
export class ApprovalRequiredError extends AgentError {
  constructor(
    public action: string,
    public reason: string
  ) {
    super(
      `Approval required for ${action}: ${reason}`,
      "APPROVAL_REQUIRED"
    )
  }
}

/**
 * Error thrown when an agent action violates platform policy
 * @planned Phase 2+ - Trust & Safety system
 * @example throw new PolicyViolationError("prohibited_items", "Cannot list weapons")
 */
export class PolicyViolationError extends AgentError {
  constructor(
    public policy: string,
    public reason: string
  ) {
    super(`Policy violation: ${policy} - ${reason}`, "POLICY_VIOLATION")
  }
}

// Error formatter for API responses
export function formatErrorResponse(error: unknown) {
  if (error instanceof RateLimitError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        ...(error.details && { details: error.details }),
      },
    }
  }

  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      },
    }
  }

  if (error instanceof Error) {
    return {
      error: {
        code: "INTERNAL_ERROR",
        message:
          process.env.NODE_ENV === "production"
            ? "An internal error occurred"
            : error.message,
        statusCode: 500,
      },
    }
  }

  return {
    error: {
      code: "UNKNOWN_ERROR",
      message: "An unknown error occurred",
      statusCode: 500,
    },
  }
}

// Error logger — forwards to Sentry when DSN is configured (no-ops otherwise)
export function logError(error: unknown, context?: Record<string, unknown>) {
  console.error("Error occurred:", {
    error,
    context,
    timestamp: new Date().toISOString(),
  })

  Sentry.captureException(error, { extra: context })
}
