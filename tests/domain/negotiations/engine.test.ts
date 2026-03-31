import { describe, it, expect } from "@jest/globals"
import {
  transition,
  canTransition,
  InvalidTransitionError,
  type BidState,
  type TransitionContext,
} from "@/domain/negotiations/engine"

const CTX: TransitionContext = {
  bidId: "bid-1",
  threadId: "thread-1",
  listingId: "listing-1",
  amount: 8000,
}

describe("negotiation engine", () => {
  describe("valid transitions from PENDING", () => {
    it("PENDING → ACCEPT → ACCEPTED with correct effects", () => {
      const result = transition("PENDING", { type: "ACCEPT", responderId: "user-1" }, CTX)

      expect(result.newState).toBe("ACCEPTED")
      expect(result.effects).toEqual(
        expect.arrayContaining([
          { type: "UPDATE_BID_STATUS", bidId: "bid-1", status: "ACCEPTED" },
          { type: "REJECT_OTHER_PENDING", threadId: "thread-1", exceptBidId: "bid-1" },
          { type: "CLOSE_THREAD", threadId: "thread-1", outcome: "ACCEPTED" },
          { type: "RESERVE_LISTING", listingId: "listing-1" },
          { type: "CREATE_ORDER", threadId: "thread-1", amount: 8000 },
        ])
      )
      expect(result.effects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "EMIT_EVENT", event: "bid.accepted" }),
        ])
      )
    })

    it("PENDING → REJECT → REJECTED", () => {
      const result = transition("PENDING", { type: "REJECT", responderId: "user-1" }, CTX)

      expect(result.newState).toBe("REJECTED")
      expect(result.effects).toEqual(
        expect.arrayContaining([
          { type: "UPDATE_BID_STATUS", bidId: "bid-1", status: "REJECTED" },
          expect.objectContaining({ type: "EMIT_EVENT", event: "bid.rejected" }),
        ])
      )
    })

    it("PENDING → COUNTER → COUNTERED with counter amount", () => {
      const result = transition("PENDING", { type: "COUNTER", amount: 9000, responderId: "user-1" }, CTX)

      expect(result.newState).toBe("COUNTERED")
      expect(result.effects).toEqual(
        expect.arrayContaining([
          { type: "UPDATE_BID_STATUS", bidId: "bid-1", status: "COUNTERED" },
          { type: "CREATE_COUNTER_BID", threadId: "thread-1", amount: 9000 },
          expect.objectContaining({ type: "EMIT_EVENT", event: "bid.countered" }),
        ])
      )
    })

    it("PENDING → EXPIRE → EXPIRED", () => {
      const result = transition("PENDING", { type: "EXPIRE" }, CTX)

      expect(result.newState).toBe("EXPIRED")
      expect(result.effects).toEqual(
        expect.arrayContaining([
          { type: "UPDATE_BID_STATUS", bidId: "bid-1", status: "EXPIRED" },
          expect.objectContaining({ type: "EMIT_EVENT", event: "bid.expired" }),
        ])
      )
    })
  })

  describe("invalid transitions from terminal states", () => {
    const TERMINAL_STATES: BidState[] = ["COUNTERED", "ACCEPTED", "REJECTED", "EXPIRED"]
    const ALL_EVENTS = [
      { type: "ACCEPT" as const, responderId: "user-1" },
      { type: "REJECT" as const, responderId: "user-1" },
      { type: "COUNTER" as const, amount: 9000, responderId: "user-1" },
      { type: "EXPIRE" as const },
    ]

    for (const state of TERMINAL_STATES) {
      for (const event of ALL_EVENTS) {
        it(`rejects ${event.type} on ${state} bid`, () => {
          expect(() => transition(state, event, CTX)).toThrow(InvalidTransitionError)
          expect(() => transition(state, event, CTX)).toThrow(`Cannot ${event.type} a bid that is ${state}`)
        })
      }
    }
  })

  describe("canTransition", () => {
    it("returns true for valid PENDING transitions", () => {
      expect(canTransition("PENDING", "ACCEPT")).toBe(true)
      expect(canTransition("PENDING", "REJECT")).toBe(true)
      expect(canTransition("PENDING", "COUNTER")).toBe(true)
      expect(canTransition("PENDING", "EXPIRE")).toBe(true)
    })

    it("returns false for terminal state transitions", () => {
      expect(canTransition("ACCEPTED", "REJECT")).toBe(false)
      expect(canTransition("REJECTED", "ACCEPT")).toBe(false)
      expect(canTransition("EXPIRED", "COUNTER")).toBe(false)
      expect(canTransition("COUNTERED", "ACCEPT")).toBe(false)
    })
  })

  describe("effect payload correctness", () => {
    it("ACCEPT effect includes bid amount from context", () => {
      const ctx = { ...CTX, amount: 12500 }
      const result = transition("PENDING", { type: "ACCEPT", responderId: "u1" }, ctx)
      const orderEffect = result.effects.find((e) => e.type === "CREATE_ORDER")
      expect(orderEffect).toEqual({ type: "CREATE_ORDER", threadId: "thread-1", amount: 12500 })
    })

    it("COUNTER effect includes counter amount from event, not context", () => {
      const result = transition("PENDING", { type: "COUNTER", amount: 7500, responderId: "u1" }, CTX)
      const createEffect = result.effects.find((e) => e.type === "CREATE_COUNTER_BID")
      expect(createEffect).toEqual({ type: "CREATE_COUNTER_BID", threadId: "thread-1", amount: 7500 })
    })
  })
})
