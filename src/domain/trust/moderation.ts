import { db } from "@/lib/db"
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors"
import { ModerationStatus, ModerationTargetType, ModeratorActionType, ListingStatus } from "@prisma/client"
import { randomUUID } from "crypto"
import type { CreateCaseInput, ListCasesInput, ResolveCaseInput } from "./validation"

/** Sentinel reporter ID used when the system auto-flags a listing. */
export const SYSTEM_REPORTER_ID = "system"

/**
 * Auto-flag threshold multipliers.
 * Flag when price > 3× category average OR price < 0.1× category average.
 */
const AUTO_FLAG_HIGH_MULTIPLIER = 3
const AUTO_FLAG_LOW_MULTIPLIER = 0.1

export class ModerationService {
  /**
   * Create a moderation case (flag) for a listing or user.
   * - Prevents self-reporting
   * - Prevents duplicate open cases for the same (reporter, target) pair
   */
  static async createCase(reporterId: string, targetId: string, input: CreateCaseInput) {
    // Prevent reporting your own listing
    if (input.targetType === ModerationTargetType.LISTING) {
      const listing = await db.listing.findUnique({ where: { id: targetId } })
      if (!listing) {
        throw new NotFoundError("Listing")
      }
      if (listing.userId === reporterId) {
        throw new ForbiddenError("You cannot report your own listing")
      }
    }

    if (input.targetType === ModerationTargetType.USER) {
      if (targetId === reporterId) {
        throw new ForbiddenError("You cannot report yourself")
      }
      const user = await db.user.findUnique({ where: { id: targetId } })
      if (!user) {
        throw new NotFoundError("User")
      }
    }

    // Prevent duplicate open cases
    const existing = await db.moderationCase.findFirst({
      where: {
        reporterId,
        targetType: input.targetType,
        targetId,
        status: { in: [ModerationStatus.PENDING, ModerationStatus.UNDER_REVIEW] },
      },
    })

    if (existing) {
      throw new ConflictError("You already have an open report for this item")
    }

    const now = new Date()

    const moderationCase = await db.moderationCase.create({
      data: {
        id: randomUUID(),
        reporterId,
        targetType: input.targetType,
        targetId,
        reason: input.reason,
        description: input.description ?? null,
        status: ModerationStatus.PENDING,
        listingId: input.targetType === ModerationTargetType.LISTING ? targetId : null,
        userId: input.targetType === ModerationTargetType.USER ? targetId : null,
        updatedAt: now,
      },
    })

    await db.auditLog.create({
      data: {
        id: randomUUID(),
        userId: reporterId,
        action: "moderation.case.created",
        entityType: "moderation_case",
        entityId: moderationCase.id,
        metadata: {
          targetType: input.targetType,
          targetId,
          reason: input.reason,
        },
      },
    })

    return moderationCase
  }

  /**
   * List all cases with optional filters, cursor-based pagination.
   */
  static async getCases(filters: ListCasesInput) {
    const { status, targetType, cursor, limit } = filters

    const cases = await db.moderationCase.findMany({
      where: {
        ...(status && { status }),
        ...(targetType && { targetType }),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      include: {
        ModerationAction: true,
      },
    })

    const hasMore = cases.length > limit
    const items = hasMore ? cases.slice(0, limit) : cases
    const nextCursor = hasMore ? items[items.length - 1].id : null

    return { items, nextCursor, hasMore }
  }

  /**
   * Get a single case by ID with its actions.
   */
  static async getCaseById(caseId: string) {
    const moderationCase = await db.moderationCase.findUnique({
      where: { id: caseId },
      include: { ModerationAction: { orderBy: { createdAt: "asc" } } },
    })

    if (!moderationCase) {
      throw new NotFoundError("ModerationCase")
    }

    return moderationCase
  }

  /**
   * Get all cases for a specific target (listing or user).
   */
  static async getCasesForTarget(targetType: ModerationTargetType, targetId: string) {
    return db.moderationCase.findMany({
      where: { targetType, targetId },
      orderBy: { createdAt: "desc" },
      include: { ModerationAction: true },
    })
  }

  /**
   * Resolve a case with a moderator action.
   */
  static async resolveCase(caseId: string, moderatorId: string, input: ResolveCaseInput) {
    const moderationCase = await db.moderationCase.findUnique({ where: { id: caseId } })

    if (!moderationCase) {
      throw new NotFoundError("ModerationCase")
    }

    if (moderationCase.status === ModerationStatus.RESOLVED || moderationCase.status === ModerationStatus.DISMISSED) {
      throw new ConflictError("Case is already closed")
    }

    const now = new Date()

    await db.$transaction(async (tx) => {
      await tx.moderationCase.update({
        where: { id: caseId },
        data: {
          status: ModerationStatus.RESOLVED,
          resolvedAt: now,
          updatedAt: now,
        },
      })

      await tx.moderationAction.create({
        data: {
          id: randomUUID(),
          caseId,
          moderatorId,
          action: input.action,
          reason: input.reason ?? null,
        },
      })

      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          userId: moderatorId,
          action: "moderation.case.resolved",
          entityType: "moderation_case",
          entityId: caseId,
          metadata: { action: input.action, reason: input.reason },
        },
      })
    })

    return db.moderationCase.findUnique({
      where: { id: caseId },
      include: { ModerationAction: true },
    })
  }

  /**
   * Dismiss a case without taking action.
   */
  static async dismissCase(caseId: string, moderatorId: string, reason?: string) {
    const moderationCase = await db.moderationCase.findUnique({ where: { id: caseId } })

    if (!moderationCase) {
      throw new NotFoundError("ModerationCase")
    }

    if (moderationCase.status === ModerationStatus.RESOLVED || moderationCase.status === ModerationStatus.DISMISSED) {
      throw new ConflictError("Case is already closed")
    }

    const now = new Date()

    await db.$transaction(async (tx) => {
      await tx.moderationCase.update({
        where: { id: caseId },
        data: {
          status: ModerationStatus.DISMISSED,
          resolvedAt: now,
          updatedAt: now,
        },
      })

      await tx.moderationAction.create({
        data: {
          id: randomUUID(),
          caseId,
          moderatorId,
          action: ModeratorActionType.DISMISS,
          reason: reason ?? null,
        },
      })

      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          userId: moderatorId,
          action: "moderation.case.dismissed",
          entityType: "moderation_case",
          entityId: caseId,
          metadata: { reason },
        },
      })
    })

    return db.moderationCase.findUnique({
      where: { id: caseId },
      include: { ModerationAction: true },
    })
  }

  /**
   * Auto-flag a listing if its price is suspiciously high or low
   * relative to the category average.
   *
   * Called from ListingService.publish — fire-and-forget (errors are swallowed
   * so they never block publication).
   */
  static async checkAutoFlag(listingId: string): Promise<void> {
    try {
      const listing = await db.listing.findUnique({ where: { id: listingId } })
      if (!listing) return

      // Calculate average price for this category (excluding removed listings)
      const aggregate = await db.listing.aggregate({
        where: {
          category: listing.category,
          status: { not: ListingStatus.REMOVED },
          id: { not: listingId },
        },
        _avg: { price: true },
        _count: { id: true },
      })

      const avg = aggregate._avg.price
      const count = aggregate._count.id

      // Need at least 3 other listings in the category for a meaningful average
      if (!avg || count < 3) return

      const tooHigh = listing.price > avg * AUTO_FLAG_HIGH_MULTIPLIER
      const tooLow = listing.price < avg * AUTO_FLAG_LOW_MULTIPLIER

      if (!tooHigh && !tooLow) return

      // Check for existing system auto-flag for this listing
      const existingAutoFlag = await db.moderationCase.findFirst({
        where: {
          reporterId: SYSTEM_REPORTER_ID,
          targetType: ModerationTargetType.LISTING,
          targetId: listingId,
          status: { in: [ModerationStatus.PENDING, ModerationStatus.UNDER_REVIEW] },
        },
      })

      if (existingAutoFlag) return

      const now = new Date()

      await db.moderationCase.create({
        data: {
          id: randomUUID(),
          reporterId: SYSTEM_REPORTER_ID,
          targetType: ModerationTargetType.LISTING,
          targetId: listingId,
          reason: "PRICE_MANIPULATION",
          description: tooHigh
            ? `Auto-flagged: price (${listing.price}) is more than ${AUTO_FLAG_HIGH_MULTIPLIER}× the category average (${Math.round(avg)})`
            : `Auto-flagged: price (${listing.price}) is less than ${AUTO_FLAG_LOW_MULTIPLIER * 100}% of the category average (${Math.round(avg)})`,
          status: ModerationStatus.PENDING,
          listingId,
          updatedAt: now,
        },
      })
    } catch {
      // Auto-flagging must never block listing publication
    }
  }
}
