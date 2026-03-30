import { auth } from "@/lib/auth"
import { ForbiddenError, UnauthorizedError } from "@/lib/errors"

/**
 * Get the set of admin user IDs from the ADMIN_USER_IDS env var.
 * Value is a comma-separated list of user IDs.
 */
function getAdminUserIds(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS ?? ""
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  return new Set(ids)
}

/**
 * Returns true if the given userId is configured as an admin.
 */
export function isAdmin(userId: string): boolean {
  return getAdminUserIds().has(userId)
}

/**
 * Require the current session user to be an admin.
 * Throws UnauthorizedError if not logged in, ForbiddenError if not admin.
 */
export async function requireAdmin(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new UnauthorizedError("Authentication required")
  }
  if (!isAdmin(session.user.id)) {
    throw new ForbiddenError("Admin access required")
  }
  return session.user.id
}
