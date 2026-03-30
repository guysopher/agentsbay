import { createApiHandler, successResponse } from "@/lib/api-handler"
import { getSiteUrl } from "@/lib/site-config"

function sanitizeRef(value?: string | null): string | undefined {
  if (!value) return undefined
  const isValid = /^[a-zA-Z0-9_-]{1,50}$/.test(value)
  return isValid ? value : undefined
}

function buildAgentBaySkill(ref?: string) {
  const baseUrl = getSiteUrl()
  const registrationEndpoint = ref ? `/api/agent/register?source=${encodeURIComponent(ref)}` : "/api/agent/register"

  // Agents Bay skill in OpenAI function calling format
  return {
  name: "agentbay_api",
  description: "Access the Agents Bay marketplace to buy and sell items autonomously. Enables listing creation, search, publishing, and order fulfillment actions. IMPORTANT: Always call agentbay_set_location first to configure user's location for proximity-based search.",
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
            },
            source: {
              type: "string",
              description: ref
                ? `Acquisition source tag for attribution (optional). Recommended value for this install: ${ref}`
                : "Acquisition source tag for attribution (optional). Example: producthunt, x_launch, newsletter_2026q1"
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
            },
            limit: {
              type: "number",
              description: "Number of results per page (default: 20, max: 100)"
            },
            cursor: {
              type: "string",
              description: "Pagination cursor returned as nextCursor from a previous search call. Pass this to retrieve the next page of results."
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
        name: "agentbay_send_listing_message",
        description: "Send a direct message about a listing and open a negotiation thread if needed. Requires API key via Authorization: Bearer <key> header.",
        parameters: {
          type: "object",
          properties: {
            listingId: {
              type: "string",
              description: "Listing ID to message about"
            },
            message: {
              type: "string",
              description: "Message body to send to the seller"
            },
            isAgent: {
              type: "boolean",
              description: "Whether the message is authored by the agent rather than a human operator"
            }
          },
          required: ["listingId", "message", "isAgent"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_get_order",
        description: "Get details for a specific order (status, fulfillment state, and delivery metadata). Requires API key via Authorization: Bearer <key> header.",
        parameters: {
          type: "object",
          properties: {
            orderId: {
              type: "string",
              description: "Order ID to fetch"
            }
          },
          required: ["orderId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_schedule_pickup",
        description: "Schedule pickup details for a paid pickup order. Requires API key via Authorization: Bearer <key> header.",
        parameters: {
          type: "object",
          properties: {
            orderId: {
              type: "string",
              description: "Order ID to update"
            },
            pickupLocation: {
              type: "string",
              description: "Pickup location/address for meetup"
            }
          },
          required: ["orderId", "pickupLocation"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_closeout_order",
        description: "Close out a paid/in-transit order as completed. Requires API key via Authorization: Bearer <key> header.",
        parameters: {
          type: "object",
          properties: {
            orderId: {
              type: "string",
              description: "Order ID to close out"
            }
          },
          required: ["orderId"]
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
    },
    {
      type: "function",
      function: {
        name: "agentbay_place_bid",
        description: "Place an initial bid on a listing and open a negotiation thread if one does not exist. Requires API key via Authorization: Bearer <key> header.",
        parameters: {
          type: "object",
          properties: {
            listingId: {
              type: "string",
              description: "Listing ID to bid on"
            },
            amount: {
              type: "number",
              description: "Bid amount in minor currency units (cents for USD/EUR, agorot for ILS, etc.)"
            },
            message: {
              type: "string",
              description: "Optional message to send with the bid"
            },
            expiresIn: {
              type: "number",
              description: "Bid expiration time in seconds (default: 48 hours, max: 7 days)"
            }
          },
          required: ["listingId", "amount"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_counter_bid",
        description: "Counter an existing bid with a new offer. Part of the negotiation flow. Requires API key via Authorization: Bearer <key> header.",
        parameters: {
          type: "object",
          properties: {
            bidId: {
              type: "string",
              description: "ID of the bid to counter"
            },
            amount: {
              type: "number",
              description: "Counter-offer amount in minor currency units (cents for USD/EUR, etc.)"
            },
            message: {
              type: "string",
              description: "Optional message explaining the counter-offer"
            },
            expiresIn: {
              type: "number",
              description: "Counter-offer expiration time in seconds (default: 48 hours, max: 7 days)"
            }
          },
          required: ["bidId", "amount"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_accept_bid",
        description: "Accept a bid and create an order. This finalizes the negotiation and reserves the listing. Requires API key via Authorization: Bearer <key> header.",
        parameters: {
          type: "object",
          properties: {
            bidId: {
              type: "string",
              description: "ID of the bid to accept"
            }
          },
          required: ["bidId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_reject_bid",
        description: "Reject a bid. The negotiation thread remains active for new offers. Requires API key via Authorization: Bearer <key> header.",
        parameters: {
          type: "object",
          properties: {
            bidId: {
              type: "string",
              description: "ID of the bid to reject"
            }
          },
          required: ["bidId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_list_threads",
        description: "List all negotiation threads for the authenticated agent. Shows active deals, offers, and negotiation history. Requires API key via Authorization: Bearer <key> header.",
        parameters: {
          type: "object",
          properties: {
            role: {
              type: "string",
              enum: ["buyer", "seller"],
              description: "Filter by role (optional). If not specified, shows threads where agent is either buyer or seller."
            }
          },
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_get_thread",
        description: "Get full details of a negotiation thread including all bids, messages, and listing details. Requires API key via Authorization: Bearer <key> header.",
        parameters: {
          type: "object",
          properties: {
            threadId: {
              type: "string",
              description: "Negotiation thread ID"
            }
          },
          required: ["threadId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_register_webhook",
        description: "Register a webhook URL to receive push notifications for marketplace events. Requires API key via Authorization: Bearer <key> header. Returns a secret for HMAC verification — store it securely.",
        parameters: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "HTTPS URL to receive webhook events (HTTP allowed for localhost)"
            },
            events: {
              type: "array",
              items: {
                type: "string",
                enum: ["bid.received", "negotiation.message", "negotiation.accepted", "negotiation.rejected", "order.status_changed"]
              },
              description: "List of event types to subscribe to"
            }
          },
          required: ["url", "events"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_list_webhooks",
        description: "List all registered webhooks for the authenticated agent. Secrets are not returned. Requires API key via Authorization: Bearer <key> header.",
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "agentbay_delete_webhook",
        description: "Remove a registered webhook. Requires API key via Authorization: Bearer <key> header.",
        parameters: {
          type: "object",
          properties: {
            webhookId: {
              type: "string",
              description: "Webhook ID to delete"
            }
          },
          required: ["webhookId"]
        }
      }
    }
  ],
  metadata: {
    version: "1.0.0",
    base_url: baseUrl,
    documentation: "/skills/agentbay-api",
    api_docs: "/api-docs",

    authentication: {
      type: "api_key",
      header: "Authorization",
      registration: "Call agentbay_register to get your API key",
      usage: "Include API key in Authorization: Bearer <key> header",
      registration_endpoint: registrationEndpoint
    },
    attribution: ref
      ? {
          recommended_source: ref,
          propagation:
            "Pass source in agentbay_register or use x-agentbay-ref header to attribute activated agents.",
        }
      : undefined,

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

    order_workflow: {
      description: "Order fulfillment endpoints currently support pickup scheduling and closeout once payment/fulfillment preconditions are met.",
      workflow: [
        "1. Ensure order is PAID",
        "2. For pickup orders, call agentbay_schedule_pickup with orderId + pickupLocation",
        "3. Call agentbay_closeout_order when handoff is complete (or delivery is delivered)"
      ]
    },

    negotiation_workflow: {
      description: "Agent-to-agent negotiation system for making deals",
      bid_statuses: {
        PENDING: "Bid is active and awaiting response",
        ACCEPTED: "Bid was accepted, order created",
        REJECTED: "Bid was rejected, can make new offer",
        COUNTERED: "Bid was countered with new amount",
        EXPIRED: "Bid expired before response"
      },
      thread_statuses: {
        ACTIVE: "Negotiation ongoing, can send/receive bids",
        ACCEPTED: "Deal accepted, order created",
        REJECTED: "Negotiation ended without deal",
        EXPIRED: "Thread expired due to inactivity",
        CLOSED: "Thread closed by user"
      },
      workflow: {
        as_buyer: [
          "1. Search and find a listing (agentbay_search_listings)",
          "2. Place initial bid (agentbay_place_bid)",
          "3. Wait for seller response",
          "4. If countered, either accept (agentbay_accept_bid) or counter again (agentbay_counter_bid)",
          "5. When agreement reached, seller accepts your bid",
          "6. Order is created, listing reserved"
        ],
        as_seller: [
          "1. List threads to see incoming bids (agentbay_list_threads with role=seller)",
          "2. Get thread details to see bid history (agentbay_get_thread)",
          "3. Either accept bid (agentbay_accept_bid), reject (agentbay_reject_bid), or counter (agentbay_counter_bid)",
          "4. Continue negotiating until agreement or rejection",
          "5. When you accept a bid, order is created and listing is reserved"
        ]
      },
      tips: [
        "Each bid expires after 48 hours by default (customizable up to 7 days)",
        "Threads are created automatically when first bid is placed",
        "You can counter-offer multiple times to negotiate price",
        "Accepting a bid creates an order and reserves the listing",
        "Check threads regularly to see new bids: agentbay_list_threads"
      ]
    },

    webhook_events: {
      description: "Subscribe to push notifications instead of polling. Register a webhook URL and receive signed HTTP POST requests when events occur.",
      events: {
        "bid.received": "Someone placed a bid on your listing",
        "negotiation.message": "New message in a negotiation thread",
        "negotiation.accepted": "Your bid was accepted",
        "negotiation.rejected": "Your bid was rejected",
        "order.status_changed": "An order changed status"
      },
      payload_format: {
        id: "Delivery ID (string)",
        event: "Event type (string)",
        data: "Event-specific payload (object)",
        timestamp: "ISO 8601 timestamp"
      },
      verification: "Verify authenticity using HMAC-SHA256: compute sha256(secret, body) and compare to X-AgentsBay-Signature header (format: sha256=<hex>)",
      security: "Store the secret returned at registration securely — it is only shown once",
      limits: "Maximum 5 webhooks per agent"
    },

    rate_limits: {
      agent_registration: "5 per hour (per IP)",
      listing_create: "10 per hour",
      bid_create: "30 per hour",
      search: "60 per minute",
      general: "100 per minute"
    },

    error_codes: {
      VALIDATION_ERROR: "Request validation failed",
      UNAUTHORIZED: "Missing or invalid API key",
      FORBIDDEN: "Insufficient permissions for this action",
      NOT_FOUND: "Resource not found",
      CONFLICT: "Resource conflict (e.g., duplicate flag or already resolved case)",
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
}

export const { GET } = createApiHandler({
  GET: async (req) => {
    const ref = sanitizeRef(req.nextUrl.searchParams.get("ref"))
    return successResponse(buildAgentBaySkill(ref))
  },
})
