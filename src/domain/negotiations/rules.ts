// ─── Types ──────────────────────────────────────────────────────────────────────

export type RuleAction =
  | { action: "ACCEPT" }
  | { action: "REJECT"; reason?: string }
  | { action: "COUNTER"; amount: number; strategy: string }
  | { action: "SKIP" }

export interface RuleContext {
  bid: { amount: number }
  listing: { askPrice: number }
  agent: {
    minAcceptAmount: number | null
    maxAcceptAmount: number | null
    autoRejectBelow: number | null
    autoCounterEnabled: boolean
    maxBidAmount: number | null
  }
  thread: { autoRoundCount: number }
}

export interface NegotiationRule {
  name: string
  evaluate(ctx: RuleContext): RuleAction | null
}

// ─── Counter Strategies ─────────────────────────────────────────────────────────

export type CounterStrategy = (bidAmount: number, askPrice: number, maxBid: number | null) => number

export const strategies: Record<string, CounterStrategy> = {
  /** Current behavior: midpoint between bid and ask, capped at maxBid */
  split: (bid, ask, maxBid) => {
    const mid = Math.round((bid + ask) / 2)
    return maxBid && mid > maxBid ? maxBid : mid
  },

  /** 25% step from bid toward ask price */
  "fixed-step": (bid, ask, maxBid) => {
    const step = Math.round(bid + (ask - bid) * 0.25)
    return maxBid && step > maxBid ? maxBid : step
  },

  /** Counter at 95% of ask price */
  aggressive: (_bid, ask, maxBid) => {
    const amount = Math.round(ask * 0.95)
    return maxBid && amount > maxBid ? maxBid : amount
  },
}

// ─── Built-in Rules ─────────────────────────────────────────────────────────────

const MAX_AUTO_ROUNDS = 5

export function maxRoundsRule(limit: number = MAX_AUTO_ROUNDS): NegotiationRule {
  return {
    name: "max-rounds",
    evaluate: (ctx) =>
      ctx.thread.autoRoundCount >= limit ? { action: "SKIP" } : null,
  }
}

export function autoAcceptRule(): NegotiationRule {
  return {
    name: "auto-accept",
    evaluate: (ctx) => {
      if (ctx.agent.minAcceptAmount && ctx.bid.amount >= ctx.agent.minAcceptAmount) {
        return { action: "ACCEPT" }
      }
      return null
    },
  }
}

export function autoRejectRule(): NegotiationRule {
  return {
    name: "auto-reject",
    evaluate: (ctx) => {
      if (ctx.agent.autoRejectBelow && ctx.bid.amount < ctx.agent.autoRejectBelow) {
        return { action: "REJECT", reason: "Below minimum threshold" }
      }
      return null
    },
  }
}

export function autoCounterRule(strategyName: string = "split"): NegotiationRule {
  return {
    name: `auto-counter-${strategyName}`,
    evaluate: (ctx) => {
      if (!ctx.agent.autoCounterEnabled) return null
      const strategy = strategies[strategyName] ?? strategies.split
      const amount = strategy(ctx.bid.amount, ctx.listing.askPrice, ctx.agent.maxBidAmount)
      return { action: "COUNTER", amount, strategy: strategyName }
    },
  }
}

/** Buyer rule: accept counter at or below what buyer considers acceptable */
export function budgetAcceptRule(): NegotiationRule {
  return {
    name: "budget-accept",
    evaluate: (ctx) => {
      if (ctx.agent.minAcceptAmount && ctx.bid.amount <= ctx.agent.minAcceptAmount) {
        return { action: "ACCEPT" }
      }
      return null
    },
  }
}

/** Buyer rule: reject if counter exceeds maxBidAmount and no auto-counter enabled */
export function budgetRejectRule(): NegotiationRule {
  return {
    name: "budget-reject",
    evaluate: (ctx) => {
      if (ctx.agent.autoRejectBelow && ctx.bid.amount > (ctx.agent.maxBidAmount ?? Infinity)) {
        return { action: "REJECT", reason: "Exceeds budget" }
      }
      return null
    },
  }
}

/** Buyer rule: counter at maxBid if amount exceeds it, accept if within budget */
export function budgetCounterRule(): NegotiationRule {
  return {
    name: "budget-counter",
    evaluate: (ctx) => {
      if (!ctx.agent.autoCounterEnabled || !ctx.agent.maxBidAmount) return null
      if (ctx.bid.amount > ctx.agent.maxBidAmount) {
        return { action: "COUNTER", amount: ctx.agent.maxBidAmount, strategy: "budget-cap" }
      }
      // Within budget — accept
      return { action: "ACCEPT" }
    },
  }
}

// ─── Default Rule Sets ──────────────────────────────────────────────────────────

/** Seller rules — replicates current auto-negotiation.ts behavior exactly */
export const DEFAULT_SELLER_RULES: NegotiationRule[] = [
  maxRoundsRule(),
  autoAcceptRule(),
  autoRejectRule(),
  autoCounterRule("split"),
]

/** Buyer rules — replicates current auto-negotiation.ts behavior exactly */
export const DEFAULT_BUYER_RULES: NegotiationRule[] = [
  maxRoundsRule(),
  budgetAcceptRule(),
  budgetRejectRule(),
  budgetCounterRule(),
]

// ─── Evaluator ──────────────────────────────────────────────────────────────────

/**
 * Evaluate rules in priority order. First rule that returns a non-null, non-SKIP
 * action wins. Returns SKIP if no rule matches or max-rounds is hit.
 */
export function evaluateRules(rules: NegotiationRule[], ctx: RuleContext): RuleAction {
  for (const rule of rules) {
    const result = rule.evaluate(ctx)
    if (result !== null) {
      return result
    }
  }
  return { action: "SKIP" }
}
