import { describe, it, expect } from "@jest/globals"
import { parseCommand } from "@/lib/command-parser"

describe("parseCommand", () => {
  // ─── Intent detection ────────────────────────────────────────────────────────

  describe("intent: search", () => {
    it("detects 'find' trigger", () => {
      const result = parseCommand("find a laptop")
      expect(result.intent).toBe("search")
    })

    it("detects 'search' trigger", () => {
      const result = parseCommand("search for furniture")
      expect(result.intent).toBe("search")
    })

    it("detects 'show' trigger", () => {
      const result = parseCommand("show me books")
      expect(result.intent).toBe("search")
    })

    it("detects 'look for' trigger", () => {
      const result = parseCommand("look for a sofa")
      expect(result.intent).toBe("search")
    })

    it("detects 'get me' trigger", () => {
      const result = parseCommand("get me a chair")
      expect(result.intent).toBe("search")
    })

    it("defaults to search for implicit queries with price modifier", () => {
      const result = parseCommand("chair under $50")
      expect(result.intent).toBe("search")
    })

    it("defaults to search for implicit queries with location modifier", () => {
      const result = parseCommand("bike near Tel Aviv")
      expect(result.intent).toBe("search")
    })

    it("defaults to search when no trigger matches", () => {
      const result = parseCommand("vintage lamp")
      expect(result.intent).toBe("search")
    })
  })

  describe("intent: create-listing", () => {
    it("detects 'sell' trigger", () => {
      const result = parseCommand("sell my old laptop for $200")
      expect(result.intent).toBe("create-listing")
    })

    it("detects 'list' trigger", () => {
      const result = parseCommand("list a chair")
      expect(result.intent).toBe("create-listing")
    })

    it("detects 'post' trigger", () => {
      const result = parseCommand("post my bike")
      expect(result.intent).toBe("create-listing")
    })

    it("detects 'create listing' trigger", () => {
      const result = parseCommand("create listing for sofa $500")
      expect(result.intent).toBe("create-listing")
    })
  })

  // ─── Category extraction ─────────────────────────────────────────────────────

  describe("category extraction", () => {
    it("matches 'electronics'", () => {
      expect(parseCommand("find electronics").params.category).toBe("ELECTRONICS")
    })

    it("matches 'laptop' → ELECTRONICS", () => {
      expect(parseCommand("find a laptop").params.category).toBe("ELECTRONICS")
    })

    it("matches 'furniture'", () => {
      expect(parseCommand("search furniture").params.category).toBe("FURNITURE")
    })

    it("matches 'chair' → FURNITURE", () => {
      expect(parseCommand("find a chair").params.category).toBe("FURNITURE")
    })

    it("matches 'clothing'", () => {
      expect(parseCommand("look for clothing").params.category).toBe("CLOTHING")
    })

    it("matches 'books'", () => {
      expect(parseCommand("search books").params.category).toBe("BOOKS")
    })

    it("matches 'sports'", () => {
      expect(parseCommand("find sports equipment").params.category).toBe("SPORTS")
    })

    it("matches 'home' → HOME_GARDEN", () => {
      expect(parseCommand("search home decor").params.category).toBe("HOME_GARDEN")
    })

    it("matches 'automotive' → VEHICLES", () => {
      expect(parseCommand("find automotive").params.category).toBe("VEHICLES")
    })

    it("matches 'car' → VEHICLES", () => {
      expect(parseCommand("find a car").params.category).toBe("VEHICLES")
    })
  })

  // ─── Price ceiling ───────────────────────────────────────────────────────────

  describe("price ceiling", () => {
    it("parses 'under $N'", () => {
      expect(parseCommand("find a chair under $50").params.maxPrice).toBe(5000)
    })

    it("parses 'below $N'", () => {
      expect(parseCommand("show laptops below $300").params.maxPrice).toBe(30000)
    })

    it("parses 'less than $N'", () => {
      expect(parseCommand("find books less than $15").params.maxPrice).toBe(1500)
    })

    it("parses 'max $N'", () => {
      expect(parseCommand("search sofa max $400").params.maxPrice).toBe(40000)
    })

    it("handles dollars with comma separator", () => {
      expect(parseCommand("find laptop under $1,200").params.maxPrice).toBe(120000)
    })
  })

  // ─── Price floor ─────────────────────────────────────────────────────────────

  describe("price floor", () => {
    it("parses 'over $N'", () => {
      expect(parseCommand("find electronics over $100").params.minPrice).toBe(10000)
    })

    it("parses 'above $N'", () => {
      expect(parseCommand("show bikes above $200").params.minPrice).toBe(20000)
    })

    it("parses 'more than $N'", () => {
      expect(parseCommand("find sofa more than $300").params.minPrice).toBe(30000)
    })

    it("parses 'min $N'", () => {
      expect(parseCommand("search chair min $50").params.minPrice).toBe(5000)
    })
  })

  // ─── Price range ─────────────────────────────────────────────────────────────

  describe("price range", () => {
    it("parses 'between $N and $N'", () => {
      const { params } = parseCommand("find laptop between $200 and $800")
      expect(params.minPrice).toBe(20000)
      expect(params.maxPrice).toBe(80000)
    })

    it("parses '$N-$N'", () => {
      const { params } = parseCommand("chair $100-$300")
      expect(params.minPrice).toBe(10000)
      expect(params.maxPrice).toBe(30000)
    })

    it("parses '$N to $N'", () => {
      const { params } = parseCommand("show furniture $50 to $200")
      expect(params.minPrice).toBe(5000)
      expect(params.maxPrice).toBe(20000)
    })
  })

  // ─── Condition extraction ────────────────────────────────────────────────────

  describe("condition extraction", () => {
    it("parses 'new'", () => {
      expect(parseCommand("find new chair").params.condition).toBe("NEW")
    })

    it("parses 'brand new'", () => {
      expect(parseCommand("find brand new laptop").params.condition).toBe("NEW")
    })

    it("parses 'like new'", () => {
      expect(parseCommand("search like new sofa").params.condition).toBe("LIKE_NEW")
    })

    it("parses 'good'", () => {
      expect(parseCommand("find good condition bike").params.condition).toBe("GOOD")
    })

    it("parses 'fair'", () => {
      expect(parseCommand("show fair condition tools").params.condition).toBe("FAIR")
    })

    it("parses 'poor'", () => {
      expect(parseCommand("find poor condition electronics").params.condition).toBe("POOR")
    })
  })

  // ─── Location extraction ─────────────────────────────────────────────────────

  describe("location extraction", () => {
    it("parses 'near X'", () => {
      expect(parseCommand("find chair near Tel Aviv").params.address).toBe("Tel Aviv")
    })

    it("parses 'in X'", () => {
      expect(parseCommand("search bikes in Seattle").params.address).toBe("Seattle")
    })

    it("parses 'around X'", () => {
      expect(parseCommand("find tools around downtown").params.address).toBe("downtown")
    })
  })

  // ─── Remaining text → query/title ────────────────────────────────────────────

  describe("remaining text mapping", () => {
    it("puts leftover text into query for search intent", () => {
      const { params } = parseCommand("find vintage lamp")
      expect(params.query).toBe("vintage lamp")
    })

    it("puts leftover text into title for create-listing intent", () => {
      const { params } = parseCommand("sell vintage lamp")
      expect(params.title).toContain("vintage lamp")
    })

    it("promotes maxPrice to price for create-listing", () => {
      const { params } = parseCommand("sell my laptop for $200")
      expect(params.price).toBe(20000)
      expect(params.maxPrice).toBeUndefined()
    })
  })

  // ─── Combined extraction ─────────────────────────────────────────────────────

  describe("combined extraction", () => {
    it("extracts category + price ceiling + condition in one query", () => {
      const { intent, params } = parseCommand(
        "find good condition laptop under $500 near Seattle"
      )
      expect(intent).toBe("search")
      expect(params.category).toBe("ELECTRONICS")
      expect(params.condition).toBe("GOOD")
      expect(params.maxPrice).toBe(50000)
      expect(params.address).toBe("Seattle")
    })

    it("handles full create-listing with category and price", () => {
      const { intent, params } = parseCommand("sell my old bike for $150")
      expect(intent).toBe("create-listing")
      expect(params.category).toBe("VEHICLES")
      expect(params.price).toBe(15000)
    })
  })
})
