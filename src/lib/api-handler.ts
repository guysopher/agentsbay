// API route handler wrapper with error handling and logging
import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { AppError, formatErrorResponse, logError } from "./errors"
import { logger } from "./logger"

type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

type RouteHandler = (
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: { params: any }
) => Promise<NextResponse> | NextResponse

interface RouteHandlers {
  GET?: RouteHandler
  POST?: RouteHandler
  PUT?: RouteHandler
  PATCH?: RouteHandler
  DELETE?: RouteHandler
}

/**
 * Wraps API route handlers with error handling, logging, and standardized responses
 *
 * Usage:
 * export const { GET, POST } = createApiHandler({
 *   GET: async (request) => {
 *     const data = await fetchData()
 *     return successResponse(data)
 *   },
 *   POST: async (request) => {
 *     const body = await request.json()
 *     const result = await createResource(body)
 *     return successResponse(result, 201)
 *   }
 * })
 */
export function createApiHandler(handlers: RouteHandlers) {
  const wrappedHandlers: Partial<Record<HTTPMethod, RouteHandler>> = {}

  for (const [method, handler] of Object.entries(handlers)) {
    if (handler) {
      wrappedHandlers[method as HTTPMethod] = async (request, context) => {
        const startTime = Date.now()
        const requestId = crypto.randomUUID()

        try {
          logger.info(`${method} ${request.nextUrl.pathname}`, {
            requestId,
            method,
            path: request.nextUrl.pathname,
            query: Object.fromEntries(request.nextUrl.searchParams),
          })

          const response = await handler(request, context)

          const duration = Date.now() - startTime
          logger.info(`${method} ${request.nextUrl.pathname} completed`, {
            requestId,
            status: response.status,
            duration,
          })

          // Add request ID to response headers
          response.headers.set("X-Request-ID", requestId)

          return response
        } catch (error) {
          const duration = Date.now() - startTime

          // Handle Zod validation errors
          if (error instanceof ZodError) {
            const formattedErrors = error.errors.map((err) => ({
              field: err.path.join("."),
              message: err.message,
            }))

            logger.warn("Validation error", {
              requestId,
              method,
              path: request.nextUrl.pathname,
              errors: formattedErrors,
              duration,
            })

            return NextResponse.json(
              {
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Validation failed",
                  details: formattedErrors,
                },
              },
              { status: 400, headers: { "X-Request-ID": requestId } }
            )
          }

          // Handle known application errors
          if (error instanceof AppError) {
            logger.warn("Application error", {
              requestId,
              method,
              path: request.nextUrl.pathname,
              error: error.message,
              code: error.code,
              duration,
            })

            return NextResponse.json(formatErrorResponse(error), {
              status: error.statusCode,
              headers: { "X-Request-ID": requestId },
            })
          }

          // Handle unknown errors
          logError(error, {
            requestId,
            method,
            path: request.nextUrl.pathname,
            duration,
          })

          return NextResponse.json(
            {
              error: {
                code: "INTERNAL_ERROR",
                message:
                  process.env.NODE_ENV === "production"
                    ? "An internal error occurred"
                    : error instanceof Error
                    ? error.message
                    : "Unknown error",
              },
            },
            { status: 500, headers: { "X-Request-ID": requestId } }
          )
        }
      }
    }
  }

  return wrappedHandlers as RouteHandlers
}

/**
 * Create a successful response
 */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(
    {
      data,
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  )
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number
    pageSize: number
    total: number
  }
) {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize)

  return NextResponse.json({
    data,
    meta: {
      timestamp: new Date().toISOString(),
    },
    pagination: {
      ...pagination,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
  })
}
