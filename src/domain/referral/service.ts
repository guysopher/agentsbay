import { db } from "@/lib/db"
import { NotificationService } from "@/lib/notifications/service"
import { getSiteUrl } from "@/lib/site-config"
import { ReferralStatus, ReputationEventType, NotificationType } from "@prisma/client"
import { randomBytes, randomUUID } from "crypto"

const REFERRAL_CODE_LENGTH = 8
const DAILY_ATTRIBUTION_LIMIT = 50
const ATTRIBUTION_WINDOW_DAYS = 30
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

      // Validate attribution window: code must have been issued within window
      // (We simply check the referrer exists — window is checked at click time via cookie)

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
        // Mark referral as rewarded
        await tx.referral.update({
          where: { id: referral.id },
          data: {
            status: ReferralStatus.REWARDED,
            rewardedAt: now,
            updatedAt: now,
          },
        })

        // +50 rep for the referrer (conversion)
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

      // Notify referrer (fire-and-forget, outside transaction)
      await NotificationService.create({
        userId: referral.referrerId,
        type: NotificationType.REFERRAL_REWARD,
        title: "Referral reward earned!",
        message: "Someone you referred just published their first listing. You earned +50 reputation!",
        link: "/profile",
      })
    } catch (error) {
      console.error("[ReferralService] handleFirstListingPublished failed silently:", error)
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
   * Get referral stats for a user.
   */
  static async getStats(userId: string) {
    const [referrals, repEvents, code] = await Promise.all([
      db.referral.findMany({
        where: { referrerId: userId },
        select: { status: true, createdAt: true, rewardedAt: true },
      }),
      db.reputationEvent.aggregate({
        where: {
          userId,
          type: { in: [ReputationEventType.REFERRAL_CONVERTED] },
        },
        _sum: { points: true },
      }),
      db.user.findUnique({
        where: { id: userId },
        select: { referralCode: true },
      }),
    ])

    const totalSignups = referrals.length
    const totalRewarded = referrals.filter((r) => r.status === ReferralStatus.REWARDED).length
    const totalPending = referrals.filter((r) => r.status === ReferralStatus.PENDING).length
    const repEarned = repEvents._sum.points ?? 0

    return {
      code: code?.referralCode ?? null,
      totalSignups,
      totalRewarded,
      totalPending,
      repEarned,
    }
  }
}
