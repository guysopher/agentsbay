// Agents Bay Constants

export const APP_NAME = "Agents Bay"
export const APP_TAGLINE = "Your agent buys and sells for you"

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

// Listing limits
export const MAX_LISTING_TITLE_LENGTH = 100
export const MAX_LISTING_DESCRIPTION_LENGTH = 2000
export const MAX_LISTING_IMAGES = 10
export const MIN_LISTING_PRICE = 100 // $1.00 in cents
export const MAX_LISTING_PRICE = 100000000 // $1,000,000 in cents

// Agent limits
export const MAX_AGENTS_PER_USER = 5
export const MAX_AGENT_NAME_LENGTH = 50
export const MAX_AGENT_DESCRIPTION_LENGTH = 500

// Negotiation limits
export const MAX_BIDS_PER_THREAD = 50
export const MAX_ACTIVE_THREADS_PER_USER = 100
export const BID_EXPIRATION_HOURS = 48
export const MAX_BID_MESSAGE_LENGTH = 500

// Rate limits (per hour)
export const RATE_LIMIT = {
  LISTING_CREATE: 10,
  BID_CREATE: 30,
  THREAD_CREATE: 20,
  WANTED_CREATE: 5,
  AGENT_CREATE: 5,
} as const

// AI/LLM settings
export const AI_CONFIDENCE_THRESHOLD = 0.8
export const AI_MAX_TOKENS = 1000
export const AI_TEMPERATURE = 0.7

// Trust & Safety
export const MIN_REPUTATION_SCORE = 0
export const MAX_REPUTATION_SCORE = 1000
export const INITIAL_REPUTATION_SCORE = 100

export const REPUTATION_POINTS = {
  SUCCESSFUL_SALE: 10,
  SUCCESSFUL_PURCHASE: 10,
  POSITIVE_REVIEW: 5,
  NEGATIVE_REVIEW: -15,
  FLAGGED_LISTING: -25,
  SCAM_REPORT: -100,
  DISPUTE_RESOLVED_FAVOR: 20,
  DISPUTE_RESOLVED_AGAINST: -30,
} as const

// File upload
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

// Categories display names
export const CATEGORY_LABELS: Record<string, string> = {
  FURNITURE: "Furniture",
  ELECTRONICS: "Electronics",
  CLOTHING: "Clothing",
  BOOKS: "Books",
  SPORTS: "Sports & Outdoors",
  TOYS: "Toys & Games",
  TOOLS: "Tools & Hardware",
  HOME_GARDEN: "Home & Garden",
  VEHICLES: "Vehicles",
  OTHER: "Other",
}

// Condition display names
export const CONDITION_LABELS: Record<string, string> = {
  NEW: "New",
  LIKE_NEW: "Like New",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
}

// Status colors for UI
export const STATUS_COLORS = {
  // Listing statuses
  DRAFT: "gray",
  PENDING_REVIEW: "yellow",
  PUBLISHED: "green",
  RESERVED: "blue",
  SOLD: "purple",
  REMOVED: "red",
  FLAGGED: "red",

  // Bid statuses
  PENDING: "yellow",
  ACCEPTED: "green",
  REJECTED: "red",
  COUNTERED: "blue",
  EXPIRED: "gray",

  // Order statuses
  PENDING_PAYMENT: "yellow",
  PAID: "blue",
  IN_TRANSIT: "purple",
  COMPLETED: "green",
  CANCELLED: "red",
  DISPUTED: "orange",
  REFUNDED: "gray",
} as const

// Notification types
export const NOTIFICATION_PRIORITY = {
  BID_RECEIVED: "normal",
  BID_ACCEPTED: "high",
  BID_REJECTED: "normal",
  BID_WITHDRAWN: "low",
  BID_COUNTERED: "normal",
  OFFER_EXPIRING: "high",
  PAYMENT_RECEIVED: "high",
  ORDER_SHIPPED: "normal",
  ORDER_DELIVERED: "high",
  LISTING_FLAGGED: "high",
  AGENT_ACTION_REQUIRED: "high",
  DEAL_FOUND: "high",
  MODERATION_ACTION: "high",
} as const

// Time constants
export const TIME = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  LISTING_DETAIL: 300, // 5 minutes
  LISTING_SEARCH: 60, // 1 minute
  USER_PROFILE: 600, // 10 minutes
  REPUTATION_SCORE: 300, // 5 minutes
} as const

// API routes
export const API_ROUTES = {
  LISTINGS: "/api/listings",
  AGENTS: "/api/agents",
  THREADS: "/api/threads",
  BIDS: "/api/bids",
  ORDERS: "/api/orders",
  WANTED: "/api/wanted",
  USERS: "/api/users",
  MODERATION: "/api/admin/moderation",
  AUDIT_LOGS: "/api/admin/audit-logs",
} as const
