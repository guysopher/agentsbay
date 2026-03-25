import { db } from "@/lib/db"
import { BidStatus, ThreadStatus, Prisma } from "@prisma/client"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { eventBus } from "@/lib/events"
import { logError } from "@/lib/errors"

export interface CreateBidInput {
  listingId: string
  buyerId: string
  buyerAgentId?: string
  amount: number
  message?: string
  expiresIn?: number // seconds
}

export interface CounterBidInput {
  amount: number
  message?: string
  expiresIn?: number
}

export class NegotiationService {
  // Place initial bid (creates thread if doesn't exist)
  static async placeBid(input: CreateBidInput) {
    try {
      // Get listing and verify it exists
      const listing = await db.listing.findUnique({
        where: { id: input.listingId },
        include: { User: true }
      })

      if (!listing) {
        throw new NotFoundError("Listing")
      }

      if (listing.status !== "PUBLISHED") {
        throw new ValidationError("Cannot bid on unpublished listing")
      }

      // Can't bid on own listing
      if (listing.userId === input.buyerId) {
        throw new ValidationError("Cannot bid on your own listing")
      }

      // Check if bid amount is reasonable
      if (input.amount < 100) { // Minimum $1
        throw new ValidationError("Bid amount too low")
      }

      if (input.amount > listing.price * 2) {
        throw new ValidationError("Bid amount unreasonably high")
      }

      const expiresAt = input.expiresIn
        ? new Date(Date.now() + input.expiresIn * 1000)
        : new Date(Date.now() + 48 * 60 * 60 * 1000) // Default 48h

      const result = await db.$transaction(async (tx) => {
        // Find or create negotiation thread
        let thread = await tx.negotiationThread.findUnique({
          where: {
            listingId_buyerId: {
              listingId: input.listingId,
              buyerId: input.buyerId
            }
          }
        })

        if (!thread) {
          thread = await tx.negotiationThread.create({
            data: {
              listingId: input.listingId,
              buyerId: input.buyerId,
              sellerId: listing.userId,
              status: ThreadStatus.ACTIVE,
              updatedAt: new Date()
            }
          })
        } else {
          // Check if thread is still active
          if (thread.status !== ThreadStatus.ACTIVE) {
            throw new ValidationError(`Thread is ${thread.status}`)
          }
        }

        // Create bid
        const bid = await tx.bid.create({
          data: {
            threadId: thread.id,
            agentId: input.buyerAgentId,
            amount: input.amount,
            message: input.message,
            status: BidStatus.PENDING,
            expiresAt,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        // Mark previous bids in thread as COUNTERED
        await tx.bid.updateMany({
          where: {
            threadId: thread.id,
            id: { not: bid.id },
            status: BidStatus.PENDING
          },
          data: {
            status: BidStatus.COUNTERED,
            updatedAt: new Date()
          }
        })

        return { thread, bid }
      })

      // Emit event
      await eventBus.emit("bid.placed", {
        bidId: result.bid.id,
        threadId: result.thread.id,
        listingId: input.listingId,
        buyerId: input.buyerId,
        sellerId: listing.userId,
        amount: input.amount
      })

      return result
    } catch (error) {
      logError(error, { input })
      throw error
    }
  }

  // Counter a bid
  static async counterBid(bidId: string, userId: string, input: CounterBidInput) {
    try {
      // Get original bid with thread
      const originalBid = await db.bid.findUnique({
        where: { id: bidId },
        include: {
          NegotiationThread: {
            include: {
              Listing: true
            }
          }
        }
      })

      if (!originalBid) {
        throw new NotFoundError("Bid")
      }

      const thread = originalBid.NegotiationThread

      // Verify user is buyer or seller
      if (thread.buyerId !== userId && thread.sellerId !== userId) {
        throw new ValidationError("Not authorized for this thread")
      }

      // Verify thread is active
      if (thread.status !== ThreadStatus.ACTIVE) {
        throw new ValidationError(`Thread is ${thread.status}`)
      }

      // Verify original bid is pending
      if (originalBid.status !== BidStatus.PENDING) {
        throw new ValidationError(`Bid is already ${originalBid.status}`)
      }

      const expiresAt = input.expiresIn
        ? new Date(Date.now() + input.expiresIn * 1000)
        : new Date(Date.now() + 48 * 60 * 60 * 1000)

      const result = await db.$transaction(async (tx) => {
        // Mark original bid as COUNTERED
        await tx.bid.update({
          where: { id: bidId },
          data: {
            status: BidStatus.COUNTERED,
            updatedAt: new Date()
          }
        })

        // Create counter bid
        const counterBid = await tx.bid.create({
          data: {
            threadId: thread.id,
            agentId: null, // Could pass agentId if available
            amount: input.amount,
            message: input.message,
            status: BidStatus.PENDING,
            expiresAt,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        // Update thread
        await tx.negotiationThread.update({
          where: { id: thread.id },
          data: { updatedAt: new Date() }
        })

        return counterBid
      })

      // Emit event
      await eventBus.emit("bid.countered", {
        originalBidId: bidId,
        newBidId: result.id,
        threadId: thread.id,
        amount: input.amount
      })

      return result
    } catch (error) {
      logError(error, { bidId, userId, input })
      throw error
    }
  }

  // Accept a bid
  static async acceptBid(bidId: string, userId: string) {
    try {
      const bid = await db.bid.findUnique({
        where: { id: bidId },
        include: {
          NegotiationThread: {
            include: {
              Listing: true
            }
          }
        }
      })

      if (!bid) {
        throw new NotFoundError("Bid")
      }

      const thread = bid.NegotiationThread

      // Verify user is authorized (buyer or seller)
      if (thread.buyerId !== userId && thread.sellerId !== userId) {
        throw new ValidationError("Not authorized for this thread")
      }

      // Verify bid is pending
      if (bid.status !== BidStatus.PENDING) {
        throw new ValidationError(`Bid is ${bid.status}`)
      }

      // Check if expired
      if (bid.expiresAt && bid.expiresAt < new Date()) {
        throw new ValidationError("Bid has expired")
      }

      const result = await db.$transaction(async (tx) => {
        // Mark bid as accepted
        const acceptedBid = await tx.bid.update({
          where: { id: bidId },
          data: {
            status: BidStatus.ACCEPTED,
            updatedAt: new Date()
          }
        })

        // Mark all other bids as rejected
        await tx.bid.updateMany({
          where: {
            threadId: thread.id,
            id: { not: bidId },
            status: BidStatus.PENDING
          },
          data: {
            status: BidStatus.REJECTED,
            updatedAt: new Date()
          }
        })

        // Update thread status
        await tx.negotiationThread.update({
          where: { id: thread.id },
          data: {
            status: ThreadStatus.ACCEPTED,
            updatedAt: new Date(),
            closedAt: new Date()
          }
        })

        // Reserve listing
        await tx.listing.update({
          where: { id: thread.listingId },
          data: {
            status: "RESERVED",
            updatedAt: new Date()
          }
        })

        // Create order
        const order = await tx.order.create({
          data: {
            listingId: thread.listingId,
            buyerId: thread.buyerId,
            sellerId: thread.sellerId,
            threadId: thread.id,
            amount: acceptedBid.amount,
            status: "PENDING_PAYMENT",
            fulfillmentMethod: thread.Listing.pickupAvailable ? "PICKUP" : "DELIVERY",
            pickupLocation: thread.Listing.pickupAvailable ? thread.Listing.address : null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        return { bid: acceptedBid, order }
      })

      // Emit event
      await eventBus.emit("bid.accepted", {
        bidId,
        threadId: thread.id,
        orderId: result.order.id,
        amount: bid.amount
      })

      return result
    } catch (error) {
      logError(error, { bidId, userId })
      throw error
    }
  }

  // Reject a bid
  static async rejectBid(bidId: string, userId: string) {
    try {
      const bid = await db.bid.findUnique({
        where: { id: bidId },
        include: {
          NegotiationThread: true
        }
      })

      if (!bid) {
        throw new NotFoundError("Bid")
      }

      const thread = bid.NegotiationThread

      // Verify user is authorized
      if (thread.buyerId !== userId && thread.sellerId !== userId) {
        throw new ValidationError("Not authorized for this thread")
      }

      if (bid.status !== BidStatus.PENDING) {
        throw new ValidationError(`Bid is ${bid.status}`)
      }

      const result = await db.$transaction(async (tx) => {
        // Mark bid as rejected
        const rejectedBid = await tx.bid.update({
          where: { id: bidId },
          data: {
            status: BidStatus.REJECTED,
            updatedAt: new Date()
          }
        })

        // Update thread
        await tx.negotiationThread.update({
          where: { id: thread.id },
          data: { updatedAt: new Date() }
        })

        return rejectedBid
      })

      // Emit event
      await eventBus.emit("bid.rejected", {
        bidId,
        threadId: thread.id
      })

      return result
    } catch (error) {
      logError(error, { bidId, userId })
      throw error
    }
  }

  // Get thread details
  static async getThread(threadId: string, userId: string) {
    const thread = await db.negotiationThread.findUnique({
      where: { id: threadId },
      include: {
        Listing: {
          include: {
            ListingImage: true
          }
        },
        Bid: {
          orderBy: { createdAt: "desc" }
        },
        NegotiationMessage: {
          orderBy: { createdAt: "asc" }
        }
      }
    })

    if (!thread) {
      throw new NotFoundError("Thread")
    }

    // Verify user is authorized
    if (thread.buyerId !== userId && thread.sellerId !== userId) {
      throw new ValidationError("Not authorized for this thread")
    }

    return thread
  }

  // List user's threads
  static async listThreads(userId: string, role?: "buyer" | "seller") {
    const where: Prisma.NegotiationThreadWhereInput = {}

    if (role === "buyer") {
      where.buyerId = userId
    } else if (role === "seller") {
      where.sellerId = userId
    } else {
      where.OR = [
        { buyerId: userId },
        { sellerId: userId }
      ]
    }

    const threads = await db.negotiationThread.findMany({
      where,
      include: {
        Listing: {
          select: {
            id: true,
            title: true,
            price: true,
            currency: true,
            status: true
          }
        },
        Bid: {
          orderBy: { createdAt: "desc" },
          take: 1 // Latest bid only
        }
      },
      orderBy: { updatedAt: "desc" }
    })

    return threads
  }
}
