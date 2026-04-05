import { db } from "@/lib/db"
import { NotificationService } from "@/lib/notifications/service"
import { getSiteUrl } from "@/lib/site-config"
import { ReferralStatus, ReputationEventType, NotificationType } from "@prisma/client"
import { randomBytes, randomUUID } from "crypto"

const REFERRAL_CODE_LENGTH = 8
const DAILY_ATTRIBUTION_LIMIT = 50
const PENDING_EXPIRY_DAYS = 90

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

function generateCode(): string {
  const bytes = randomBytes(REFERRAL_CODE_LENGTH)
  return Array.from(bytes)
    .map((b) => CHARS[b % CHARS.length])
    .join("")
}

export class ReferralService {
  /**
   * Return the user's referral code, generating and persisting one lazily.
   */
  static async getOrCreateCode(userId: string): Promise<string> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    })
    if (!user) throw new Error("User not found")
    if (user.referralCode) return user.referralCode

    // Generate a unique code with retry on collision
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode()
      try {
        const updated = await db.user.update({
          where: { id: userId },
          data: { referralCode: code },
          select: { referralCode: true },
        })
        return updated.referralCode!
      } catch {
        // unique constraint violation → retry
      }
    }
    throw new Error("Failed to generate unique referral code")
  }

  /**
   * Build the full shareable referral URL.
   */
  static buildReferralUrl(code: string): string {
    const base = getSiteUrl()
    return `${base}/r/${code}`
  }

  /**
   * Attribute a newly signed-up user to a referrer.
   * Called after user creation during signup.
   * Silent on all errors — never blocks signup.
   */
  static async attributeSignup(refereeId: string, refCode: string): Promise<void> {
    try {
      // Look up the referrer by code
      const referrer = await db.user.findUnique({
        where: { referralCode: refCode },
        select: { id: true },
      })
      if (!referrer) return

      // Block self-referral
      if (referrer.id === refereeId) return

      // Block re-attribution (refereeId is @unique in Referral)
      const existing = await db.referral.findUnique({
        where: { refereeId },
        select: { id: true },
      })
      if (existing) return

      // Rate-limit: max 50 attributions per code per day
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const todayCount = await db.referral.count({
        where: { code: refCode, createdAt: { gte: oneDayAgo } },
      })
      if (todayCount >= DAILY_ATTRIBUTION_LIMIT) return

      await db.$transaction(async (tx) => {
        await tx.referral.create({
          data: {
            id: randomUUID(),
            referrerId: referrer.id,
            refereeId,
            code: refCode,
            status: ReferralStatus.PENDING,
            updatedAt: new Date(),
          },
        })

        // +10 rep for the referee (being invited)
        await tx.reputationEvent.create({
          data: {
            id: randomUUID(),
            userId: refereeId,
            type: ReputationEventType.REFERRAL_INVITED,
            points: 10,
            reason: "Joined via a referral link",
          },
        })
      })
    } catch (error) {
      console.error("[ReferralService] attributeSignup failed silently:", error)
    }
  }

  /**
   * Explicitly apply a referral code for an authenticated user.
   * Unlike attributeSignup, this throws on invalid input.
   *
   * Throws with a descriptive message on:
   * - invalid / unknown code
   * - self-referral
   * - user already referred
   */
  static async applyCode(userId: string, code: string): Promise<{ referrerId: string }> {
    const referrer = await db.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    })
    if (!referrer) {
      throw new InvalidReferralCodeError("Invalid or unknown referral code")
    }

    if (referrer.id === userId) {
      throw new SelfReferralError("You cannot use your own referral code")
    }

    const existing = await db.referral.findUnique({
      where: { refereeId: userId },
      select: { id: true },
    })
    if (existing) {
      throw new AlreadyReferredError("A referral code has already been applied to your account")
    }

    // Rate-limit: max 50 attributions per code per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const todayCount = await db.referral.count({
      where: { code, createdAt: { gte: oneDayAgo } },
    })
    if (todayCount >= DAILY_ATTRIBUTION_LIMIT) {
      throw new InvalidReferralCodeError("This referral code has reached its daily limit")
    }

    await db.$transaction(async (tx) => {
      await tx.referral.create({
        data: {
          id: randomUUID(),
          referrerId: referrer.id,
          refereeId: userId,
          code,
          status: ReferralStatus.PENDING,
          updatedAt: new Date(),
        },
      })

      await tx.reputationEvent.create({
        data: {
          id: randomUUID(),
          userId,
          type: ReputationEventType.REFERRAL_INVITED,
          points: 10,
          reason: "Applied a referral code",
        },
      })
    })

    return { referrerId: referrer.id }
  }

  /**
   * Called when a user publishes a listing.
   * If this is their first listing AND they are a pending referee,
   * award the referrer and mark the referral REWARDED.
   */
  static async handleFirstListingPublished(userId: string): Promise<void> {
    try {
      // Check if this is their first published listing
      const publishedCount = await db.listing.count({
        where: { userId, status: "PUBLISHED", deletedAt: null },
      })
      if (publishedCount !== 1) return

      // Look up pending referral for this user as referee
      const referral = await db.referral.findUnique({
        where: { refereeId: userId },
        select: { id: true, referrerId: true, status: true },
      })
      if (!referral || referral.status !== ReferralStatus.PENDING) return

      const now = new Date()

      await db.$transaction(async (tx) => {
        await tx.referral.update({
          where: { id: referral.id },
          data: {
            status: ReferralStatus.REWARDED,
            rewardedAt: now,
            updatedAt: now,
          },
        })

        await tx.reputationEvent.create({
          data: {
            id: randomUUID(),
            userId: referral.referrerId,
            type: ReputationEventType.REFERRAL_CONVERTED,
            points: 50,
            reason: "Your referred user published their first listing",
          },
        })
      })

      await NotificationService.create({
        userId: referral.referrerId,
        type: NotificationType.REFERRAL_REWARD,
        title: "Referral reward earned!",
        message:
          "Someone you referred just published their first listing. You earned +50 reputation!",
        link: "/profile",
      })
    } catch (error) {
      console.error("[ReferralService] handleFirstListingPublished failed silently:", error)
    }
  }

  /**
   * Called when a buyer completes their first transaction (order reaches COMPLETED).
   * Awards the referrer and marks the referral REWARDED.
   * Silent on all errors — never blocks the order completion flow.
   */
  static async handleFirstTransactionCompleted(buyerId: string): Promise<void> {
    try {
      // Check if this is the buyer's first completed order
      const completedCount = await db.order.count({
        where: { buyerId, status: "COMPLETED" },
      })
      if (completedCount !== 1) return

      // Look up pending referral for this buyer as referee
      const referral = await db.referral.findUnique({
        where: { refereeId: buyerId },
        select: { id: true, referrerId: true, status: true },
      })
      if (!referral || referral.status !== ReferralStatus.PENDING) return

      const now = new Date()

      await db.$transaction(async (tx) => {
        await tx.referral.update({
          where: { id: referral.id },
          data: {
            status: ReferralStatus.REWARDED,
            rewardedAt: now,
            updatedAt: now,
          },
        })

        // +50 rep for the referrer (conversion via first transaction)
        await tx.reputationEvent.create({
          data: {
            id: randomUUID(),
            userId: referral.referrerId,
            type: ReputationEventType.REFERRAL_CONVERTED,
            points: 50,
            reason: "Your referred user completed their first transaction",
          },
        })
      })

      await NotificationService.create({
        userId: referral.referrerId,
        type: NotificationType.REFERRAL_REWARD,
        title: "Referral reward earned!",
        message:
          "Someone you referred just completed their first purchase. You earned +50 reputation!",
        link: "/profile",
      })
    } catch (error) {
      console.error("[ReferralService] handleFirstTransactionCompleted failed silently:", error)
    }
  }

  /**
   * Expire PENDING referrals older than 90 days (for cron jobs).
   */
  static async expireStaleReferrals(): Promise<number> {
    const cutoff = new Date(Date.now() - PENDING_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    const result = await db.referral.updateMany({
      where: { status: ReferralStatus.PENDING, createdAt: { lt: cutoff } },
      data: { status: ReferralStatus.EXPIRED, updatedAt: new Date() },
    })
    return result.count
  }

  /**
   * Get referral stats for the authenticated user.
   * Lazily creates a referral code if the user doesn't have one yet.
   */
  static async getStats(userId: string) {
    const [referrals, referralCode] = await Promise.all([
      db.referral.findMany({
        where: { referrerId: userId },
        select: { status: true },
      }),
      ReferralService.getOrCreateCode(userId),
    ])

    const referralCount = referrals.length
    const claimedRewards = referrals.filter((r) => r.status === ReferralStatus.REWARDED).length
    const pendingRewards = referrals.filter((r) => r.status === ReferralStatus.PENDING).length

    return {
      referralCode,
      referralCount,
      pendingRewards,
      claimedRewards,
    }
  }
}

export class InvalidReferralCodeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "InvalidReferralCodeError"
  }
}

export class SelfReferralError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SelfReferralError"
  }
}

export class AlreadyReferredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AlreadyReferredError"
  }
}
