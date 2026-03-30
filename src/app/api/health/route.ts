import { checkRuntimeBootstrap } from "@/lib/runtime-bootstrap"
import { requestMetrics } from "@/lib/request-metrics"
import { NextResponse } from "next/server"

const VERSION = process.env.npm_package_version ?? "0.1.0"

export async function GET() {
  const result = await checkRuntimeBootstrap({ skipCache: true })

  if (!result.ok) {
    return NextResponse.json(
      {
        status: "error",
        message: result.message,
        missingEnv: result.missingEnv,
        invalidEnv: result.invalidEnv,
        database: result.database,
        setupSteps: result.setupSteps,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }

  return NextResponse.json({
    status: "ok",
    version: VERSION,
    uptime: requestMetrics.getUptime(),
    requestCount: requestMetrics.getRequestCount(),
    database: result.database,
    timestamp: new Date().toISOString(),
  })
}
