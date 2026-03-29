import { NextRequest, NextResponse } from "next/server"

function notFound(request: NextRequest) {
  return NextResponse.json(
    {
      error: {
        code: "NOT_FOUND",
        message: `API route not found: ${request.nextUrl.pathname}`,
        status: 404,
      },
    },
    { status: 404 }
  )
}

export const GET = notFound
export const POST = notFound
export const PUT = notFound
export const PATCH = notFound
export const DELETE = notFound
