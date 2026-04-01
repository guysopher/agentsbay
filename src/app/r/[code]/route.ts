import { NextRequest, NextResponse } from "next/server"

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds
const CODE_PATTERN = /^[A-Z0-9]{8}$/

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  // Validate code format before setting cookie
  if (!CODE_PATTERN.test(code)) {
    return NextResponse.redirect(new URL("/auth/signup", req.url))
  }

  const signupUrl = new URL("/auth/signup", req.url)
  signupUrl.searchParams.set("ref", code)

  const res = NextResponse.redirect(signupUrl)

  // Set cookie so the ref survives navigation / page refresh
  // httpOnly: false so client JS can also sync to localStorage
  res.cookies.set("ref_code", code, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  })

  return res
}
