import { describe, it, expect } from "@jest/globals"
import {
  evaluateRules,
  DEFAULT_SELLER_RULES,
  DEFAULT_BUYER_RULES,
  autoAcceptRule,
  autoRejectRule,
  autoCounterRule,
  maxRoundsRule,
  budgetAcceptRule,
  budgetCounterRule,
  strategies,
  type RuleContext,
} from "@/domain/negotiations/rules"

function makeCtx(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    bid: { amount: 7000 },
    listing: { askPrice: 10000 },
    agent: {
      minAcceptAmount: null,
      maxAcceptAmount: null,
      autoRejectBelow: null,
      autoCounterEnabled: false,
      maxBidAmount: null,
    },
    thread: { autoRoundCount: 0 },
    ...overrides,
  }
}

describe("counter strategies", () => {
  it("split: midpoint between bid and ask", () => {
    expect(strategies.split(7000, 10000, null)).toBe(8500)
  })

  it("split: caps at maxBid", () => {
    expect(strategies.split(7000, 10000, 8000)).toBe(8000)
  })

  it("split: returns midpoint when maxBid is above it", () => {
    expect(strategies.split(7000, 10000, 9000)).toBe(8500)
  })

  it("fixed-step: 25% step from bid toward ask", () => {
    expect(strategies["fixed-step"](7000, 10000, null)).toBe(7750)
  })

  it("fixed-step: caps at maxBid", () => {
    expect(strategies["fixed-step"](7000, 10000, 7500)).toBe(7500)
  })

  it("aggressive: 95% of ask price", () => {
    expect(strategies.aggressive(7000, 10000, null)).toBe(9500)
  })

  it("aggressive: caps at maxBid", () => {
    expect(strategies.aggressive(7000, 10000, 9000)).toBe(9000)
  })
})

describe("individual rules", () => {
  describe("maxRoundsRule", () => {
    it("returns SKIP when at or above limit", () => {
      const ctx = makeCtx({ thread: { autoRoundCount: 5 } })
      expect(maxRoundsRule(5).evaluate(ctx)).toEqual({ action: "SKIP" })
    })

    it("returns null when below limit", () => {
      const ctx = makeCtx({ thread: { autoRoundCount: 4 } })
      expect(maxRoundsRule(5).evaluate(ctx)).toBeNull()
    })
  })

  describe("autoAcceptRule", () => {
    it("accepts when bid >= minAcceptAmount", () => {
      const ctx = makeCtx({ agent: { ...makeCtx().agent, minAcceptAmount: 7000 } })
      expect(autoAcceptRule().evaluate(ctx)).toEqual({ action: "ACCEPT" })
    })

    it("accepts when bid > minAcceptAmount", () => {
      const ctx = makeCtx({
        bid: { amount: 9000 },
        agent: { ...makeCtx().agent, minAcceptAmount: 8000 },
      })
      expect(autoAcceptRule().evaluate(ctx)).toEqual({ action: "ACCEPT" })
    })

    it("returns null when minAcceptAmount not set", () => {
      expect(autoAcceptRule().evaluate(makeCtx())).toBeNull()
    })

    it("returns null when bid < minAcceptAmount", () => {
      const ctx = makeCtx({ agent: { ...makeCtx().agent, minAcceptAmount: 8000 } })
      expect(autoAcceptRule().evaluate(ctx)).toBeNull()
    })
  })

  describe("autoRejectRule", () => {
    it("rejects when bid < autoRejectBelow", () => {
      const ctx = makeCtx({
        bid: { amount: 3000 },
        agent: { ...makeCtx().agent, autoRejectBelow: 5000 },
      })
      expect(autoRejectRule().evaluate(ctx)).toEqual({
        action: "REJECT",
        reason: "Below minimum threshold",
      })
    })

    it("returns null when bid >= autoRejectBelow", () => {
      const ctx = makeCtx({
        bid: { amount: 5000 },
        agent: { ...makeCtx().agent, autoRejectBelow: 5000 },
      })
      expect(autoRejectRule().evaluate(ctx)).toBeNull()
    })

    it("returns null when autoRejectBelow not set", () => {
      expect(autoRejectRule().evaluate(makeCtx())).toBeNull()
    })
  })

  describe("autoCounterRule", () => {
    it("counters with split strategy when enabled", () => {
      const ctx = makeCtx({ agent: { ...makeCtx().agent, autoCounterEnabled: true } })
      const result = autoCounterRule("split").evaluate(ctx)
      expect(result).toEqual({ action: "COUNTER", amount: 8500, strategy: "split" })
    })

    it("returns null when autoCounterEnabled is false", () => {
      expect(autoCounterRule("split").evaluate(makeCtx())).toBeNull()
    })

    it("falls back to split strategy for unknown strategy name", () => {
      const ctx = makeCtx({ agent: { ...makeCtx().agent, autoCounterEnabled: true } })
      const result = autoCounterRule("nonexistent").evaluate(ctx)
      expect(result).toEqual({ action: "COUNTER", amount: 8500, strategy: "nonexistent" })
    })
  })

  describe("budgetAcceptRule (buyer)", () => {
    it("accepts when counter <= minAcceptAmount", () => {
      const ctx = makeCtx({
        bid: { amount: 9000 },
        agent: { ...makeCtx().agent, minAcceptAmount: 9500 },
      })
      expect(budgetAcceptRule().evaluate(ctx)).toEqual({ action: "ACCEPT" })
    })

    it("returns null when counter > minAcceptAmount", () => {
      const ctx = makeCtx({
        bid: { amount: 9600 },
        agent: { ...makeCtx().agent, minAcceptAmount: 9500 },
      })
      expect(budgetAcceptRule().evaluate(ctx)).toBeNull()
    })
  })

  describe("budgetCounterRule (buyer)", () => {
    it("counters at maxBid when amount exceeds it", () => {
      const ctx = makeCtx({
        bid: { amount: 9500 },
        agent: { ...makeCtx().agent, autoCounterEnabled: true, maxBidAmount: 8500 },
      })
      expect(budgetCounterRule().evaluate(ctx)).toEqual({
        action: "COUNTER",
        amount: 8500,
        strategy: "budget-cap",
      })
    })

    it("accepts when amount within maxBid", () => {
      const ctx = makeCtx({
        bid: { amount: 8000 },
        agent: { ...makeCtx().agent, autoCounterEnabled: true, maxBidAmount: 8500 },
      })
      expect(budgetCounterRule().evaluate(ctx)).toEqual({ action: "ACCEPT" })
    })

    it("returns null when autoCounterEnabled is false", () => {
      const ctx = makeCtx({
        bid: { amount: 9500 },
        agent: { ...makeCtx().agent, autoCounterEnabled: false, maxBidAmount: 8500 },
      })
      expect(budgetCounterRule().evaluate(ctx)).toBeNull()
    })
  })
})

describe("DEFAULT_SELLER_RULES chain", () => {
  it("stops at max rounds", () => {
    const ctx = makeCtx({
      thread: { autoRoundCount: 5 },
      agent: { ...makeCtx().agent, minAcceptAmount: 5000 },
    })
    expect(evaluateRules(DEFAULT_SELLER_RULES, ctx)).toEqual({ action: "SKIP" })
  })

  it("auto-accepts when bid >= minAcceptAmount", () => {
    const ctx = makeCtx({
      bid: { amount: 9000 },
      agent: { ...makeCtx().agent, minAcceptAmount: 8000 },
    })
    expect(evaluateRules(DEFAULT_SELLER_RULES, ctx)).toEqual({ action: "ACCEPT" })
  })

  it("auto-rejects when bid < autoRejectBelow", () => {
    const ctx = makeCtx({
      bid: { amount: 3000 },
      agent: { ...makeCtx().agent, autoRejectBelow: 5000 },
    })
    expect(evaluateRules(DEFAULT_SELLER_RULES, ctx)).toEqual({
      action: "REJECT",
      reason: "Below minimum threshold",
    })
  })

  it("auto-counters with split when all thresholds pass", () => {
    const ctx = makeCtx({
      bid: { amount: 7000 },
      agent: {
        ...makeCtx().agent,
        minAcceptAmount: 9000,
        autoRejectBelow: 3000,
        autoCounterEnabled: true,
      },
    })
    expect(evaluateRules(DEFAULT_SELLER_RULES, ctx)).toEqual({
      action: "COUNTER",
      amount: 8500,
      strategy: "split",
    })
  })

  it("returns SKIP when no rules match", () => {
    const ctx = makeCtx() // no thresholds, counter disabled
    expect(evaluateRules(DEFAULT_SELLER_RULES, ctx)).toEqual({ action: "SKIP" })
  })
})

describe("DEFAULT_BUYER_RULES chain", () => {
  it("auto-accepts when counter <= minAcceptAmount", () => {
    const ctx = makeCtx({
      bid: { amount: 9000 },
      agent: { ...makeCtx().agent, minAcceptAmount: 9500 },
    })
    expect(evaluateRules(DEFAULT_BUYER_RULES, ctx)).toEqual({ action: "ACCEPT" })
  })

  it("auto-counters at maxBid when counter exceeds budget", () => {
    const ctx = makeCtx({
      bid: { amount: 9500 },
      agent: { ...makeCtx().agent, autoCounterEnabled: true, maxBidAmount: 8500 },
    })
    expect(evaluateRules(DEFAULT_BUYER_RULES, ctx)).toEqual({
      action: "COUNTER",
      amount: 8500,
      strategy: "budget-cap",
    })
  })

  it("auto-accepts when counter is within budget", () => {
    const ctx = makeCtx({
      bid: { amount: 8000 },
      agent: { ...makeCtx().agent, autoCounterEnabled: true, maxBidAmount: 8500 },
    })
    expect(evaluateRules(DEFAULT_BUYER_RULES, ctx)).toEqual({ action: "ACCEPT" })
  })
})
