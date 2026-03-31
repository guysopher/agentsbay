import { db } from "@/lib/db"
import { BidStatus, ThreadStatus, Prisma } from "@prisma/client"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { eventBus } from "@/lib/events"
import { logError } from "@/lib/errors"
import { randomUUID } from "crypto"
import { canTransition, InvalidTransitionError, type BidState } from "./engine"

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
  agentId?: string
}

export interface SendMessageInput {
  content: string
  isAgent: boolean
}

/**
 * Service for managing negotiations between buyers and sellers
 * Handles bid placement, counter-offers, acceptance/rejection, and thread management
 */
export class NegotiationService {
  /**
   * Place a bid on a listing (creates negotiation thread if doesn't exist)
   * @param input - Bid details (listing ID, buyer ID, amount, optional message)
   * @returns Created bid with thread information
   * @throws {NotFoundError} If listing doesn't exist
   * @throws {ValidationError} If listing is unpublished, bid is on own listing, or amount is invalid
   * @emits bid.placed
   * @example
   * ```ts
   * const bid = await NegotiationService.placeBid({
   *   listingId: "listing123",
   *   buyerId: "user456",
   *   buyerAgentId: "agent789",
   *   amount: 85000, // $850 in cents
   *   message: "Would you accept $850?",
   *   expiresIn: 86400 // 24 hours
   * })
   * ```
   */
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
              id: randomUUID(),
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
            id: randomUUID(),
            threadId: thread.id,
            agentId: input.buyerAgentId,
            placedByUserId: input.buyerId,
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

  /**
   * Make a counter-offer on an existing bid
   * @param bidId - ID of the bid to counter
   * @param userId - ID of the user making counter-offer (must be seller)
   * @param input - Counter-offer details (amount, optional message, expiration)
   * @returns Created counter-bid
   * @throws {NotFoundError} If bid doesn't exist
   * @throws {ValidationError} If user isn't seller, bid isn't pending, thread is closed, or amount is invalid
   * @emits bid.countered
   * @example
   * ```ts
   * const counter = await NegotiationService.counterBid(bidId, sellerId, {
   *   amount: 90000, // Counter at $900
   *   message: "Can you do $900?",
   *   expiresIn: 43200 // 12 hours
   * })
   * ```
   */
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
        throw new ForbiddenError("Not authorized for this thread")
      }

      // Turn enforcement: only the party that did NOT place this bid can counter it
      if (originalBid.placedByUserId && originalBid.placedByUserId === userId) {
        throw new ForbiddenError("Cannot counter your own bid — waiting for the other party")
      }

      // Verify thread is active
      if (thread.status !== ThreadStatus.ACTIVE) {
        throw new ValidationError(`Thread is ${thread.status}`)
      }

      // Validate state transition via engine
      if (!canTransition(originalBid.status as BidState, "COUNTER")) {
        throw new InvalidTransitionError(originalBid.status as BidState, "COUNTER")
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
            id: randomUUID(),
            threadId: thread.id,
            agentId: input.agentId ?? null,
            placedByUserId: userId,
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

  /**
   * Accept a bid (closes negotiation, marks listing as sold)
   * @param bidId - ID of the bid to accept
   * @param userId - ID of the user accepting (must be seller)
   * @returns Accepted bid
   * @throws {NotFoundError} If bid doesn't exist
   * @throws {ValidationError} If user isn't seller, bid isn't pending, or listing already sold
   * @emits bid.accepted
   * @example
   * ```ts
   * await NegotiationService.acceptBid(bidId, sellerId)
   * // Listing marked as SOLD, thread closed, other bids rejected
   * ```
   */
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
        throw new ForbiddenError("Not authorized for this thread")
      }

      // Turn enforcement: only the party that did NOT place this bid can accept it
      if (bid.placedByUserId && bid.placedByUserId === userId) {
        throw new ForbiddenError("Cannot accept your own bid — waiting for the other party")
      }

      // Validate state transition via engine
      if (!canTransition(bid.status as BidState, "ACCEPT")) {
        throw new InvalidTransitionError(bid.status as BidState, "ACCEPT")
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
            id: randomUUID(),
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

  /**
   * Reject a bid
   * @param bidId - ID of the bid to reject
   * @param userId - ID of the user rejecting (must be seller)
   * @returns Rejected bid
   * @throws {NotFoundError} If bid doesn't exist
   * @throws {ValidationError} If user isn't seller or bid isn't pending
   * @emits bid.rejected
   * @example
   * ```ts
   * await NegotiationService.rejectBid(bidId, sellerId)
   * ```
   */
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
        throw new ForbiddenError("Not authorized for this thread")
      }

      // Validate state transition via engine
      if (!canTransition(bid.status as BidState, "REJECT")) {
        throw new InvalidTransitionError(bid.status as BidState, "REJECT")
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

  /**
   * Send a direct message to a seller about a listing.
   * Creates a negotiation thread when the buyer is contacting the seller for the first time.
   */
  static async sendMessage(
    listingId: string,
    userId: string,
    input: SendMessageInput
  ) {
    try {
      const listing = await db.listing.findUnique({
        where: { id: listingId },
      })

      if (!listing) {
        throw new NotFoundError("Listing")
      }

      if (listing.userId === userId) {
        throw new ValidationError("Cannot message your own listing")
      }

      if (listing.status !== "PUBLISHED" && listing.status !== "RESERVED") {
        throw new ValidationError("Cannot message an unavailable listing")
      }

      const result = await db.$transaction(async (tx) => {
        let thread = await tx.negotiationThread.findUnique({
          where: {
            listingId_buyerId: {
              listingId,
              buyerId: userId,
            },
          },
        })

        if (!thread) {
          thread = await tx.negotiationThread.create({
            data: {
              id: randomUUID(),
              listingId,
              buyerId: userId,
              sellerId: listing.userId,
              status: ThreadStatus.ACTIVE,
              updatedAt: new Date(),
            },
          })
        } else if (thread.status !== ThreadStatus.ACTIVE) {
          throw new ValidationError(`Thread is ${thread.status}`)
        }

        const message = await tx.negotiationMessage.create({
          data: {
            id: randomUUID(),
            threadId: thread.id,
            content: input.content,
            isAgent: input.isAgent,
          },
        })

        await tx.negotiationThread.update({
          where: { id: thread.id },
          data: { updatedAt: message.createdAt },
        })

        return { thread, message }
      })

      await eventBus.emit("negotiation.started", {
        threadId: result.thread.id,
        listingId,
      })

      return result
    } catch (error) {
      logError(error, { listingId, userId, input })
      throw error
    }
  }

  /**
   * Get negotiation thread details with all bids
   * @param threadId - ID of the negotiation thread
   * @param userId - ID of the user (must be buyer or seller in thread)
   * @returns Thread with listing and all bids sorted by creation date
   * @throws {NotFoundError} If thread doesn't exist or user isn't participant
   * @example
   * ```ts
   * const thread = await NegotiationService.getThread(threadId, userId)
   * // thread.Listing, thread.Bid[] with full history
   * ```
   */
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
      throw new ForbiddenError("Not authorized for this thread")
    }

    return thread
  }

  /**
   * List negotiation threads for a user with cursor pagination
   * @param userId - ID of the user
   * @param role - Filter by role: "buyer", "seller", or undefined (all threads)
   * @param cursor - Cursor (thread ID) to start after
   * @param limit - Max items to return (default 20, max 100)
   * @returns Paginated threads with listing info and latest bid, sorted by update time
   */
  static async listThreads(
    userId: string,
    role?: "buyer" | "seller",
    cursor?: string,
    limit: number = 20
  ) {
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
      orderBy: { updatedAt: "desc" },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    })

    const hasMore = threads.length > limit
    const items = hasMore ? threads.slice(0, limit) : threads
    const nextCursor = hasMore ? items[items.length - 1].id : null

    return { items, nextCursor, hasMore }
  }
}
