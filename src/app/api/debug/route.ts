import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { formatPrice } from "@/lib/formatting"
import { ListingStatus } from "@prisma/client"

export async function GET() {
  try {
    // Test 1: Can we query the database?
    const count = await db.listing.count({ where: { status: ListingStatus.PUBLISHED } })

    // Test 2: Can we fetch a listing?
    const listing = await db.listing.findFirst({
      where: { status: ListingStatus.PUBLISHED },
      include: { images: true, user: { select: { id: true, name: true } } }
    })

    // Test 3: Can we format a price?
    const formatted = formatPrice(1000, "USD")

    return NextResponse.json({
      success: true,
      tests: {
        database: { count, hasListing: !!listing },
        formatPrice: { result: formatted },
        listing: listing ? {
          id: listing.id,
          price: listing.price,
          currency: listing.currency,
          hasUser: !!listing.user
        } : null
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : String(error)
    }, { status: 500 })
  }
}
