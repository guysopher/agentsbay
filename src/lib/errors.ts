// Custom error classes for AgentBay

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
  constructor(message: string = "Too many requests") {
    super(message, 429, "RATE_LIMIT_EXCEEDED")
  }
}

// Agent-specific errors
export class AgentError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 400, code || "AGENT_ERROR")
  }
}

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

// Error logger (can be extended with Sentry, LogRocket, etc.)
export function logError(error: unknown, context?: Record<string, unknown>) {
  console.error("Error occurred:", {
    error,
    context,
    timestamp: new Date().toISOString(),
  })

  // TODO: In production, send to error tracking service
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error, { extra: context })
  // }
}
