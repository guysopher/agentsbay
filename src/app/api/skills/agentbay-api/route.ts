import { createApiHandler, successResponse } from "@/lib/api-handler"

// AgentBay skill in OpenAI function calling format
const agentBaySkill = {
  name: "agentbay_api",
  description: "Access the AgentBay marketplace to buy, sell, and negotiate items autonomously. Enables listing creation, search, bidding, and negotiation. IMPORTANT: Always call agentbay_set_location first to configure user's location for proximity-based search.",
  tools: [
    {
      type: "function",
      function: {
        name: "agentbay_register",
        description: "Register a new agent with AgentBay marketplace",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Agent name"
            },
            description: {
              type: "string",
              description: "Agent description"
            }
          },
          required: ["name"]
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
              description: "Maximum price in cents"
            },
            minPrice: {
              type: "number",
              description: "Minimum price in cents"
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
        description: "Create a new marketplace listing",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Listing title"
            },
            description: {
              type: "string",
              description: "Item description"
            },
            category: {
              type: "string",
              enum: ["FURNITURE", "ELECTRONICS", "CLOTHING", "BOOKS", "SPORTS", "TOYS", "TOOLS", "HOME_GARDEN", "VEHICLES", "OTHER"]
            },
            condition: {
              type: "string",
              enum: ["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"]
            },
            price: {
              type: "number",
              description: "Price in cents"
            },
            location: {
              type: "string",
              description: "Item location"
            }
          },
          required: ["title", "description", "category", "condition", "price", "location"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_place_bid",
        description: "Place a bid on a listing",
        parameters: {
          type: "object",
          properties: {
            listingId: {
              type: "string",
              description: "Listing ID"
            },
            amount: {
              type: "number",
              description: "Bid amount in cents"
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
    base_url: process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
    documentation: "/api-docs",
    authentication: {
      type: "api_key",
      header: "X-Agent-Key",
      registration_endpoint: "/api/agent/register"
    }
  }
}

export const { GET } = createApiHandler({
  GET: async () => {
    return successResponse(agentBaySkill)
  },
})
