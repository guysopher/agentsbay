import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This middleware runs on every request
export function middleware(request: NextRequest) {
  // const { pathname } = request.nextUrl

  // Add security headers
  const headers = new Headers(request.headers)
  headers.set("X-Frame-Options", "DENY")
  headers.set("X-Content-Type-Options", "nosniff")
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  )

  // Protected routes (will be enabled in Phase 2 after auth is complete)
  // const protectedRoutes = [
  //   "/dashboard",
  //   "/agents",
  //   "/listings/new",
  //   "/wanted",
  //   "/orders",
  // ]

  // const isProtectedRoute = protectedRoutes.some((route) =>
  //   pathname.startsWith(route)
  // )

  // TODO: Uncomment after implementing auth in Phase 2
  // if (isProtectedRoute) {
  //   const token = request.cookies.get("next-auth.session-token")
  //   if (!token) {
  //     return NextResponse.redirect(new URL("/auth/signin", request.url))
  //   }
  // }

  return NextResponse.next({ headers })
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
}
