import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Try a simple database query
    const count = await db.listing.count()

    return NextResponse.json({
      status: "ok",
      database: {
        connected: true,
        listingCount: count
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      status: "error",
      database: {
        connected: false,
        error: error instanceof Error ? error.message : String(error)
      },
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
