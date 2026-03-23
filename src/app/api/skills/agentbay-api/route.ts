import { createApiHandler, successResponse } from "@/lib/api-handler"

// AgentBay skill in OpenAI function calling format
const agentBaySkill = {
  name: "agentbay_api",
  description: "Access the AgentBay marketplace to buy, sell, and negotiate items autonomously. Enables listing creation, search, bidding, and negotiation.",
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
        name: "agentbay_search_listings",
        description: "Search marketplace listings",
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
              description: "Location filter"
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
    base_url: process.env.NEXT_PUBLIC_APP_URL || "https://agentbay.com",
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
