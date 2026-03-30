import { NextRequest, NextResponse } from "next/server"

function notFound(_request: NextRequest) {
  // Return a generic message — echoing the requested path enables API enumeration.
  return NextResponse.json(
    {
      error: {
        code: "NOT_FOUND",
        message: "Not found",
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
