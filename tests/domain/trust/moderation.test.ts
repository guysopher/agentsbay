import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { ModerationReason, ModerationStatus, ModerationTargetType, ModeratorActionType } from "@prisma/client"
import { ModerationService, SYSTEM_REPORTER_ID } from "@/domain/trust/moderation"
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors"
import { db } from "@/lib/db"

const REPORTER_ID = "reporter-1"
const LISTING_ID = "listing-1"
const USER_ID = "user-1"
const CASE_ID = "case-1"
const MODERATOR_ID = "mod-1"

function makeListing(overrides: Partial<{ id: string; userId: string }> = {}) {
  return {
    id: LISTING_ID,
    userId: USER_ID,
    ...overrides,
  }
}

function makeCase(overrides: Partial<{
  id: string
  status: ModerationStatus
  reporterId: string
}> = {}) {
  return {
    id: CASE_ID,
    reporterId: REPORTER_ID,
    targetType: ModerationTargetType.LISTING,
    targetId: LISTING_ID,
    reason: ModerationReason.SCAM,
    description: null,
    status: ModerationStatus.PENDING,
    ...overrides,
  }
}

describe("ModerationService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("createCase", () => {
    it("creates a case for a listing", async () => {
      jest.spyOn(db.listing, "findUnique").mockResolvedValue(makeListing() as never)
      jest.spyOn(db.moderationCase, "findFirst").mockResolvedValue(null as never)
      const createMock = jest.spyOn(db.moderationCase, "create").mockResolvedValue(makeCase() as never)
      jest.spyOn(db.auditLog, "create").mockResolvedValue({} as never)

      const result = await ModerationService.createCase(REPORTER_ID, LISTING_ID, {
        targetType: ModerationTargetType.LISTING,
        reason: ModerationReason.SCAM,
      })

      expect(createMock).toHaveBeenCalledTimes(1)
      expect(result.reporterId).toBe(REPORTER_ID)
    })

    it("throws ForbiddenError when user reports their own listing", async () => {
      jest.spyOn(db.listing, "findUnique").mockResolvedValue(
        makeListing({ userId: REPORTER_ID }) as never
      )

      await expect(
        ModerationService.createCase(REPORTER_ID, LISTING_ID, {
          targetType: ModerationTargetType.LISTING,
          reason: ModerationReason.SCAM,
        })
      ).rejects.toThrow(ForbiddenError)
    })

    it("throws NotFoundError when listing does not exist", async () => {
      jest.spyOn(db.listing, "findUnique").mockResolvedValue(null as never)

      await expect(
        ModerationService.createCase(REPORTER_ID, LISTING_ID, {
          targetType: ModerationTargetType.LISTING,
          reason: ModerationReason.SCAM,
        })
      ).rejects.toThrow(NotFoundError)
    })

    it("throws ConflictError for duplicate open case", async () => {
      jest.spyOn(db.listing, "findUnique").mockResolvedValue(makeListing() as never)
      jest.spyOn(db.moderationCase, "findFirst").mockResolvedValue(makeCase() as never)

      await expect(
        ModerationService.createCase(REPORTER_ID, LISTING_ID, {
          targetType: ModerationTargetType.LISTING,
          reason: ModerationReason.SCAM,
        })
      ).rejects.toThrow(ConflictError)
    })

    it("throws ForbiddenError when user reports themselves", async () => {
      jest.spyOn(db.user, "findUnique").mockResolvedValue({ id: REPORTER_ID } as never)

      await expect(
        ModerationService.createCase(REPORTER_ID, REPORTER_ID, {
          targetType: ModerationTargetType.USER,
          reason: ModerationReason.HARASSMENT,
        })
      ).rejects.toThrow(ForbiddenError)
    })

    it("throws NotFoundError when target user does not exist", async () => {
      jest.spyOn(db.user, "findUnique").mockResolvedValue(null as never)

      await expect(
        ModerationService.createCase(REPORTER_ID, "nonexistent-user", {
          targetType: ModerationTargetType.USER,
          reason: ModerationReason.HARASSMENT,
        })
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe("getCaseById", () => {
    it("returns case with actions when found", async () => {
      const caseWithActions = { ...makeCase(), ModerationAction: [] }
      jest.spyOn(db.moderationCase, "findUnique").mockResolvedValue(caseWithActions as never)

      const result = await ModerationService.getCaseById(CASE_ID)
      expect(result.id).toBe(CASE_ID)
    })

    it("throws NotFoundError when case does not exist", async () => {
      jest.spyOn(db.moderationCase, "findUnique").mockResolvedValue(null as never)

      await expect(ModerationService.getCaseById(CASE_ID)).rejects.toThrow(NotFoundError)
    })
  })

  describe("resolveCase", () => {
    function mockTransaction() {
      return jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) =>
        fn({
          moderationCase: {
            update: jest.fn().mockResolvedValue({}),
          },
          moderationAction: {
            create: jest.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        })
      )
    }

    it("resolves an open case", async () => {
      jest.spyOn(db.moderationCase, "findUnique")
        .mockResolvedValueOnce(makeCase() as never)
        .mockResolvedValueOnce({ ...makeCase({ status: ModerationStatus.RESOLVED }), ModerationAction: [] } as never)
      mockTransaction()

      const result = await ModerationService.resolveCase(CASE_ID, MODERATOR_ID, {
        action: ModeratorActionType.REMOVE_LISTING,
      })

      expect(result?.status).toBe(ModerationStatus.RESOLVED)
    })

    it("throws NotFoundError when case does not exist", async () => {
      jest.spyOn(db.moderationCase, "findUnique").mockResolvedValue(null as never)

      await expect(
        ModerationService.resolveCase(CASE_ID, MODERATOR_ID, { action: ModeratorActionType.WARN_USER })
      ).rejects.toThrow(NotFoundError)
    })

    it("throws ConflictError when case is already resolved", async () => {
      jest.spyOn(db.moderationCase, "findUnique").mockResolvedValue(
        makeCase({ status: ModerationStatus.RESOLVED }) as never
      )

      await expect(
        ModerationService.resolveCase(CASE_ID, MODERATOR_ID, { action: ModeratorActionType.WARN_USER })
      ).rejects.toThrow(ConflictError)
    })

    it("throws ConflictError when case is already dismissed", async () => {
      jest.spyOn(db.moderationCase, "findUnique").mockResolvedValue(
        makeCase({ status: ModerationStatus.DISMISSED }) as never
      )

      await expect(
        ModerationService.resolveCase(CASE_ID, MODERATOR_ID, { action: ModeratorActionType.WARN_USER })
      ).rejects.toThrow(ConflictError)
    })
  })

  describe("dismissCase", () => {
    function mockTransaction() {
      return jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) =>
        fn({
          moderationCase: {
            update: jest.fn().mockResolvedValue({}),
          },
          moderationAction: {
            create: jest.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        })
      )
    }

    it("dismisses an open case", async () => {
      jest.spyOn(db.moderationCase, "findUnique")
        .mockResolvedValueOnce(makeCase() as never)
        .mockResolvedValueOnce({ ...makeCase({ status: ModerationStatus.DISMISSED }), ModerationAction: [] } as never)
      mockTransaction()

      const result = await ModerationService.dismissCase(CASE_ID, MODERATOR_ID, "Not a violation")

      expect(result?.status).toBe(ModerationStatus.DISMISSED)
    })

    it("throws ConflictError when case is already closed", async () => {
      jest.spyOn(db.moderationCase, "findUnique").mockResolvedValue(
        makeCase({ status: ModerationStatus.DISMISSED }) as never
      )

      await expect(ModerationService.dismissCase(CASE_ID, MODERATOR_ID)).rejects.toThrow(ConflictError)
    })
  })

  describe("checkAutoFlag", () => {
    it("creates a system case when price is too high", async () => {
      jest.spyOn(db.listing, "findUnique").mockResolvedValue({
        id: LISTING_ID,
        price: 100000,
        category: "ELECTRONICS",
      } as never)

      jest.spyOn(db.listing, "aggregate").mockResolvedValue({
        _avg: { price: 10000 },
        _count: { id: 5 },
      } as never)

      jest.spyOn(db.moderationCase, "findFirst").mockResolvedValue(null as never)
      const createMock = jest.spyOn(db.moderationCase, "create").mockResolvedValue({} as never)

      await ModerationService.checkAutoFlag(LISTING_ID)

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reporterId: SYSTEM_REPORTER_ID,
            reason: "PRICE_MANIPULATION",
          }),
        })
      )
    })

    it("creates a system case when price is too low", async () => {
      jest.spyOn(db.listing, "findUnique").mockResolvedValue({
        id: LISTING_ID,
        price: 10,
        category: "ELECTRONICS",
      } as never)

      jest.spyOn(db.listing, "aggregate").mockResolvedValue({
        _avg: { price: 10000 },
        _count: { id: 5 },
      } as never)

      jest.spyOn(db.moderationCase, "findFirst").mockResolvedValue(null as never)
      const createMock = jest.spyOn(db.moderationCase, "create").mockResolvedValue({} as never)

      await ModerationService.checkAutoFlag(LISTING_ID)

      expect(createMock).toHaveBeenCalled()
    })

    it("does not flag when price is normal", async () => {
      jest.spyOn(db.listing, "findUnique").mockResolvedValue({
        id: LISTING_ID,
        price: 10000,
        category: "ELECTRONICS",
      } as never)

      jest.spyOn(db.listing, "aggregate").mockResolvedValue({
        _avg: { price: 10000 },
        _count: { id: 5 },
      } as never)

      const createMock = jest.spyOn(db.moderationCase, "create").mockResolvedValue({} as never)

      await ModerationService.checkAutoFlag(LISTING_ID)

      expect(createMock).not.toHaveBeenCalled()
    })

    it("does not flag when fewer than 3 comparable listings exist", async () => {
      jest.spyOn(db.listing, "findUnique").mockResolvedValue({
        id: LISTING_ID,
        price: 999999,
        category: "ELECTRONICS",
      } as never)

      jest.spyOn(db.listing, "aggregate").mockResolvedValue({
        _avg: { price: 100 },
        _count: { id: 2 },
      } as never)

      const createMock = jest.spyOn(db.moderationCase, "create").mockResolvedValue({} as never)

      await ModerationService.checkAutoFlag(LISTING_ID)

      expect(createMock).not.toHaveBeenCalled()
    })

    it("does not duplicate existing open auto-flag", async () => {
      jest.spyOn(db.listing, "findUnique").mockResolvedValue({
        id: LISTING_ID,
        price: 100000,
        category: "ELECTRONICS",
      } as never)

      jest.spyOn(db.listing, "aggregate").mockResolvedValue({
        _avg: { price: 10000 },
        _count: { id: 5 },
      } as never)

      jest.spyOn(db.moderationCase, "findFirst").mockResolvedValue(makeCase({
        reporterId: SYSTEM_REPORTER_ID,
      }) as never)

      const createMock = jest.spyOn(db.moderationCase, "create").mockResolvedValue({} as never)

      await ModerationService.checkAutoFlag(LISTING_ID)

      expect(createMock).not.toHaveBeenCalled()
    })

    it("swallows errors to never block listing publication", async () => {
      jest.spyOn(db.listing, "findUnique").mockRejectedValue(new Error("DB error") as never)

      // Should not throw
      await expect(ModerationService.checkAutoFlag(LISTING_ID)).resolves.toBeUndefined()
    })
  })
})
