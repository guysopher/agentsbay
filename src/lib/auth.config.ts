import type { NextAuthConfig } from "next-auth"

/**
 * Edge-safe auth configuration.
 * This file must NOT import Prisma, bcrypt, or any Node.js-only modules.
 * It is used by the middleware (Edge runtime) for JWT session checks.
 * The full auth config (with adapter + credentials) lives in auth.ts.
 */
export default {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [],  // Providers are added in auth.ts (Node runtime only)
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      // This callback is used by the middleware to check auth state
      // Returning true allows the request to proceed
      // The actual route-level auth logic is in middleware.ts
      return true
    },
  },
} satisfies NextAuthConfig
