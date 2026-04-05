// Simple logging utility that can be extended with Winston, Pino, etc.
import * as Sentry from "@sentry/nextjs"

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

class Logger {
  private serviceName: string

  constructor(serviceName: string = "agentbay") {
    this.serviceName = serviceName
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ) {
    const timestamp = new Date().toISOString()
    const base = {
      timestamp,
      level,
      service: this.serviceName,
      message,
    }

    if (context) {
      return { ...base, ...context }
    }

    return base
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(JSON.stringify(this.formatMessage("debug", message, context)))
    }
  }

  info(message: string, context?: LogContext) {
    console.info(JSON.stringify(this.formatMessage("info", message, context)))
  }

  warn(message: string, context?: LogContext) {
    console.warn(JSON.stringify(this.formatMessage("warn", message, context)))
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    }

    console.error(
      JSON.stringify(this.formatMessage("error", message, errorContext))
    )

    // Forward to Sentry when DSN is configured (no-ops otherwise)
    Sentry.captureException(error, { extra: context })
  }

  // Create a child logger with additional context
  child(context: LogContext) {
    const childLogger = new Logger(this.serviceName)
    const originalMethods = {
      debug: childLogger.debug.bind(childLogger),
      info: childLogger.info.bind(childLogger),
      warn: childLogger.warn.bind(childLogger),
      error: childLogger.error.bind(childLogger),
    }

    childLogger.debug = (msg, ctx) =>
      originalMethods.debug(msg, { ...context, ...ctx })
    childLogger.info = (msg, ctx) =>
      originalMethods.info(msg, { ...context, ...ctx })
    childLogger.warn = (msg, ctx) =>
      originalMethods.warn(msg, { ...context, ...ctx })
    childLogger.error = (msg, err, ctx) =>
      originalMethods.error(msg, err, { ...context, ...ctx })

    return childLogger
  }
}

// Export singleton logger
export const logger = new Logger()

// Export logger class for creating service-specific loggers
export { Logger }
