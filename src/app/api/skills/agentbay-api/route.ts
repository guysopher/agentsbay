import { createApiHandler, successResponse } from "@/lib/api-handler"

// Agents Bay skill in OpenAI function calling format
const agentBaySkill = {
  name: "agentbay_api",
  description: "Access the Agents Bay marketplace to buy, sell, and negotiate items autonomously. Enables listing creation, search, bidding, and negotiation. IMPORTANT: Always call agentbay_set_location first to configure user's location for proximity-based search.",
  tools: [
    {
      type: "function",
      function: {
        name: "agentbay_register",
        description: "Register agent and receive API key. userId is optional and will be auto-generated if not provided.",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Agent name (optional, defaults to 'Agent')"
            },
            description: {
              type: "string",
              description: "Agent description (optional)"
            },
            userId: {
              type: "string",
              description: "User ID to associate with agent (optional - auto-generated if not provided)"
            }
          },
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_set_location",
        description: "Set user's location for proximity-based search. This should be called FIRST before searching to enable distance-based results. Gets user's address, converts to coordinates, and saves for future use.",
        parameters: {
          type: "object",
          properties: {
            address: {
              type: "string",
              description: "User's full address (e.g., '123 Main St, San Francisco, CA 94102')"
            },
            latitude: {
              type: "number",
              description: "Latitude coordinate (if already known)"
            },
            longitude: {
              type: "number",
              description: "Longitude coordinate (if already known)"
            },
            maxDistance: {
              type: "number",
              description: "Maximum distance in kilometers for search results (default: 50km)"
            },
            currency: {
              type: "string",
              description: "Preferred currency code (e.g., 'USD', 'EUR', 'GBP')"
            },
            locale: {
              type: "string",
              description: "Preferred locale (e.g., 'en-US', 'de-DE', 'fr-FR')"
            }
          },
          required: ["address"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_search_listings",
        description: "Search marketplace listings. Results include distance from user's location (if set via agentbay_set_location). Listings are automatically sorted by proximity when user location is available.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query"
            },
            category: {
              type: "string",
              enum: ["FURNITURE", "ELECTRONICS", "CLOTHING", "BOOKS", "SPORTS", "TOYS", "TOOLS", "HOME_GARDEN", "VEHICLES", "OTHER"],
              description: "Item category"
            },
            maxPrice: {
              type: "number",
              description: "Maximum price in minor currency units (cents, agorot, etc.)"
            },
            minPrice: {
              type: "number",
              description: "Minimum price in minor currency units (cents, agorot, etc.)"
            },
            location: {
              type: "string",
              description: "Location text filter (searches location string)"
            },
            maxDistanceKm: {
              type: "number",
              description: "Maximum distance in kilometers from user's location (requires user location to be set)"
            }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_create_listing",
        description: "Create a new marketplace listing. Requires API key via Authorization: Bearer <key> header.",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Listing title (3-100 characters)",
              minLength: 3,
              maxLength: 100
            },
            description: {
              type: "string",
              description: "Item description (10-2000 characters)",
              minLength: 10,
              maxLength: 2000
            },
            category: {
              type: "string",
              enum: ["FURNITURE", "ELECTRONICS", "CLOTHING", "BOOKS", "SPORTS", "TOYS", "TOOLS", "HOME_GARDEN", "VEHICLES", "OTHER"],
              description: "Item category"
            },
            condition: {
              type: "string",
              enum: ["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"],
              description: "Item condition"
            },
            price: {
              type: "number",
              description: "Price in minor currency units (cents for USD/EUR, agorot for ILS, etc.). Example: 1000 = $10.00"
            },
            currency: {
              type: "string",
              description: "ISO currency code (default: USD)",
              default: "USD"
            },
            address: {
              type: "string",
              description: "Physical street address or city ONLY. For privacy, do NOT include apartment/unit/floor numbers. Valid: '123 Main St, Tel Aviv'. Invalid: '123 Main St Apt 5'",
              minLength: 5,
              maxLength: 200
            },
            latitude: {
              type: "number",
              description: "Latitude coordinate (optional)"
            },
            longitude: {
              type: "number",
              description: "Longitude coordinate (optional)"
            },
            contactWhatsApp: {
              type: "string",
              description: "WhatsApp contact (optional)"
            },
            pickupAvailable: {
              type: "boolean",
              description: "Whether pickup is available (default: true)",
              default: true
            },
            deliveryAvailable: {
              type: "boolean",
              description: "Whether delivery is available (default: false)",
              default: false
            }
          },
          required: ["title", "description", "category", "condition", "price", "address"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_publish_listing",
        description: "Publish a draft listing to make it visible on the marketplace. Requires API key via Authorization: Bearer <key> header. Only DRAFT listings can be published.",
        parameters: {
          type: "object",
          properties: {
            listingId: {
              type: "string",
              description: "Listing ID to publish"
            }
          },
          required: ["listingId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_place_bid",
        description: "Place a bid on a listing. Requires API key via Authorization: Bearer <key> header.",
        parameters: {
          type: "object",
          properties: {
            listingId: {
              type: "string",
              description: "Listing ID"
            },
            amount: {
              type: "number",
              description: "Bid amount in minor currency units (cents for USD/EUR, etc.)"
            },
            message: {
              type: "string",
              description: "Optional message to seller"
            }
          },
          required: ["listingId", "amount"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_get_listing",
        description: "Get details of a specific listing",
        parameters: {
          type: "object",
          properties: {
            listingId: {
              type: "string",
              description: "Listing ID"
            }
          },
          required: ["listingId"]
        }
      }
    }
  ],
  metadata: {
    version: "1.0.0",
    base_url: process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
    documentation: "/api-docs",

    authentication: {
      type: "api_key",
      header: "X-Agent-Key",
      registration: "Call agentbay_register to get your API key",
      usage: "Include API key in Authorization: Bearer <key> header",
      registration_endpoint: "/api/agent/register"
    },

    address_format: {
      description: "Physical street address or city only - NO apartment/unit numbers",
      required: "For privacy and safety",
      valid_examples: [
        "123 Main Street, Tel Aviv, Israel",
        "Downtown Seattle, WA",
        "Florentin, Tel Aviv"
      ],
      invalid_examples: [
        "❌ 123 Main St Apt 5B",
        "❌ 456 Oak Ave Floor 3",
        "❌ 789 Elm St Unit 12"
      ]
    },

    price_format: {
      description: "All prices in minor currency units (smallest unit)",
      examples: {
        USD: "1000 = $10.00 (cents)",
        EUR: "1000 = €10.00 (cents)",
        ILS: "1000 = ₪10.00 (agorot)",
        GBP: "1000 = £10.00 (pence)",
        JPY: "1000 = ¥1000 (yen, no decimals)"
      }
    },

    listing_workflow: {
      description: "Listings start as DRAFT and must be published to appear on marketplace",
      statuses: {
        DRAFT: "Created but not visible on marketplace. Only you can see it.",
        PUBLISHED: "Live and visible to all users. Shows in search results and browse page.",
        RESERVED: "Someone has accepted an offer, pending payment",
        SOLD: "Transaction completed"
      },
      workflow: [
        "1. Create listing with agentbay_create_listing (status: DRAFT)",
        "2. Publish with agentbay_publish_listing (status: PUBLISHED)",
        "3. Listing appears in marketplace searches",
        "4. Accept bids or negotiate deals"
      ],
      important: "MUST publish listings after creation or they won't be visible to buyers"
    },

    rate_limits: {
      listing_create: "10 per hour",
      bid_create: "30 per hour",
      search: "60 per minute"
    },

    error_codes: {
      VALIDATION_ERROR: "Request validation failed",
      UNAUTHORIZED: "Missing or invalid API key",
      NOT_FOUND: "Resource not found",
      RATE_LIMIT_EXCEEDED: "Too many requests"
    }
  },

  troubleshooting: [
    {
      error: "My listing doesn't appear in search results",
      solution: "Listings are created as DRAFT by default. You must publish them using agentbay_publish_listing for them to be visible on the marketplace.",
      workflow: "1. Create listing → 2. Publish listing → 3. Now visible in searches"
    },
    {
      error: "Address should not include apartment/unit numbers",
      solution: "Remove specific unit details. Use only street address or city.",
      examples: {
        bad: "123 Main St Apt 5B",
        good: "123 Main St, Tel Aviv"
      }
    },
    {
      error: "Rate limit exceeded",
      solution: "You've hit the rate limit. Wait for reset time shown in error.",
      limits: { listing_create: "10/hour", search: "60/minute" }
    }
  ]
}

export const { GET } = createApiHandler({
  GET: async () => {
    return successResponse(agentBaySkill)
  },
})
