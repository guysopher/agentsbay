import { ValidationError } from "@/lib/errors"

// ─── Types ──────────────────────────────────────────────────────────────────────

export type BidState = "PENDING" | "COUNTERED" | "ACCEPTED" | "REJECTED" | "EXPIRED"
export type ThreadOutcome = "ACCEPTED" | "REJECTED" | "EXPIRED" | "CLOSED"

export type NegotiationEvent =
  | { type: "COUNTER"; amount: number; responderId: string }
  | { type: "ACCEPT"; responderId: string }
  | { type: "REJECT"; responderId: string }
  | { type: "EXPIRE" }

export type NegotiationEffect =
  | { type: "UPDATE_BID_STATUS"; bidId: string; status: BidState }
  | { type: "CREATE_COUNTER_BID"; threadId: string; amount: number; message?: string }
  | { type: "REJECT_OTHER_PENDING"; threadId: string; exceptBidId: string }
  | { type: "CLOSE_THREAD"; threadId: string; outcome: ThreadOutcome }
  | { type: "CREATE_ORDER"; threadId: string; amount: number }
  | { type: "RESERVE_LISTING"; listingId: string }
  | { type: "EMIT_EVENT"; event: string; payload: Record<string, unknown> }

export interface TransitionContext {
  bidId: string
  threadId: string
  listingId: string
  amount: number
}

export interface TransitionResult {
  newState: BidState
  effects: NegotiationEffect[]
}

// ─── Error ──────────────────────────────────────────────────────────────────────

export class InvalidTransitionError extends ValidationError {
  constructor(currentState: BidState, eventType: NegotiationEvent["type"]) {
    super(`Cannot ${eventType} a bid that is ${currentState}`)
  }
}

// ─── Transition Handlers ────────────────────────────────────────────────────────

type TransitionHandler = (event: NegotiationEvent, ctx: TransitionContext) => TransitionResult

const PENDING_TRANSITIONS: Record<string, TransitionHandler> = {
  COUNTER: (event, ctx) => {
    const e = event as Extract<NegotiationEvent, { type: "COUNTER" }>
    return {
      newState: "COUNTERED",
      effects: [
        { type: "UPDATE_BID_STATUS", bidId: ctx.bidId, status: "COUNTERED" },
        { type: "CREATE_COUNTER_BID", threadId: ctx.threadId, amount: e.amount },
        { type: "EMIT_EVENT", event: "bid.countered", payload: { originalBidId: ctx.bidId, threadId: ctx.threadId, amount: e.amount } },
      ],
    }
  },

  ACCEPT: (_event, ctx) => ({
    newState: "ACCEPTED",
    effects: [
      { type: "UPDATE_BID_STATUS", bidId: ctx.bidId, status: "ACCEPTED" },
      { type: "REJECT_OTHER_PENDING", threadId: ctx.threadId, exceptBidId: ctx.bidId },
      { type: "CLOSE_THREAD", threadId: ctx.threadId, outcome: "ACCEPTED" },
      { type: "RESERVE_LISTING", listingId: ctx.listingId },
      { type: "CREATE_ORDER", threadId: ctx.threadId, amount: ctx.amount },
      { type: "EMIT_EVENT", event: "bid.accepted", payload: { bidId: ctx.bidId, threadId: ctx.threadId, amount: ctx.amount } },
    ],
  }),

  REJECT: (_event, ctx) => ({
    newState: "REJECTED",
    effects: [
      { type: "UPDATE_BID_STATUS", bidId: ctx.bidId, status: "REJECTED" },
      { type: "EMIT_EVENT", event: "bid.rejected", payload: { bidId: ctx.bidId, threadId: ctx.threadId } },
    ],
  }),

  EXPIRE: (_event, ctx) => ({
    newState: "EXPIRED",
    effects: [
      { type: "UPDATE_BID_STATUS", bidId: ctx.bidId, status: "EXPIRED" },
      { type: "EMIT_EVENT", event: "bid.expired", payload: { bidId: ctx.bidId, threadId: ctx.threadId } },
    ],
  }),
}

// Terminal states have no valid transitions
const TRANSITIONS: Record<BidState, Record<string, TransitionHandler>> = {
  PENDING: PENDING_TRANSITIONS,
  COUNTERED: {},
  ACCEPTED: {},
  REJECTED: {},
  EXPIRED: {},
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Pure-function state machine. Takes current bid state + event, returns new state + effects.
 * Throws InvalidTransitionError for illegal transitions.
 * Caller is responsible for executing the returned effects.
 */
export function transition(
  currentState: BidState,
  event: NegotiationEvent,
  ctx: TransitionContext
): TransitionResult {
  const handlers = TRANSITIONS[currentState]
  const handler = handlers[event.type]

  if (!handler) {
    throw new InvalidTransitionError(currentState, event.type)
  }

  return handler(event, ctx)
}

/**
 * Check whether a transition is valid without executing it.
 */
export function canTransition(currentState: BidState, eventType: NegotiationEvent["type"]): boolean {
  return eventType in TRANSITIONS[currentState]
}
