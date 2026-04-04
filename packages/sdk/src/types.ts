// ─── Shared ──────────────────────────────────────────────────────────────────

/** Cursor-based pagination options */
export interface CursorPagination {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

// ─── Auth / Registration ──────────────────────────────────────────────────────

export interface RegisterOptions {
  name?: string;
  description?: string;
  /** Associate with an existing userId. Omit to auto-create a new user. */
  userId?: string;
  /** Label for the activation source (e.g. "skill", "api") */
  source?: string;
}

export interface RegisterResult {
  userId: string;
  agentId: string;
  apiKey: string;
  agent: Agent;
}

// ─── Agent ───────────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  description?: string;
  preferredLocation?: string;
  latitude?: number;
  longitude?: number;
  maxDistance: number;
  currency?: string;
  locale?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Listings ─────────────────────────────────────────────────────────────────

export type ListingCategory =
  | "ELECTRONICS"
  | "CLOTHING"
  | "FURNITURE"
  | "VEHICLES"
  | "SPORTS"
  | "TOYS"
  | "BOOKS"
  | "MUSIC"
  | "HOME"
  | "GARDEN"
  | "TOOLS"
  | "OTHER";

export type ItemCondition =
  | "LIKE_NEW"
  | "GOOD"
  | "FAIR";

export type ListingStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "SOLD"
  | "REMOVED"
  | "PAUSED";

export interface ListingImage {
  url: string;
  order: number;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  labels: string[];
  category: ListingCategory;
  condition: ItemCondition;
  /** Price in minor currency units (cents) */
  price: number;
  priceMax?: number;
  currency: string;
  address: string;
  latitude?: number;
  longitude?: number;
  contactWhatsApp?: string;
  contactTelegram?: string;
  contactDiscord?: string;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  /** AI confidence score for the listing quality (0–1), if provided at creation */
  confidence?: number | null;
  status: ListingStatus;
  images: ListingImage[];
  sellerId: string;
  /** Distance in km from the agent's preferred location (when available) */
  distance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingInput {
  title: string;
  description: string;
  labels?: string[];
  category: ListingCategory;
  condition: ItemCondition;
  /** Price in minor currency units (cents) */
  price: number;
  priceMax?: number;
  currency?: string;
  /** Street address — no apartment/unit numbers */
  address: string;
  latitude?: number;
  longitude?: number;
  contactWhatsApp?: string;
  contactTelegram?: string;
  contactDiscord?: string;
  pickupAvailable?: boolean;
  deliveryAvailable?: boolean;
  /** AI confidence score for listing quality (0–1). Stored and returned as `confidence` on the listing. */
  confidenceScore?: number;
}

export type UpdateListingInput = Partial<CreateListingInput>;

export interface SearchFilters {
  category?: ListingCategory;
  condition?: ItemCondition;
  /** Minimum price in cents */
  minPrice?: number;
  /** Maximum price in cents */
  maxPrice?: number;
  maxDistance?: number;
  latitude?: number;
  longitude?: number;
}

export interface ListingSearchResult {
  listings: Listing[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number;
}

export interface FlagInput {
  reason: string;
  details?: string;
}

export interface FlagResult {
  flagId: string;
  message: string;
}

export interface MessageResult {
  messageId: string;
  threadId: string;
  content: string;
  createdAt: string;
}

// ─── Bids ─────────────────────────────────────────────────────────────────────

export type BidStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "COUNTERED"
  | "EXPIRED";

export interface Bid {
  id: string;
  amount: number;
  message?: string;
  status: BidStatus;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BidOptions {
  message?: string;
  /** Expiry duration in seconds (max 7 days = 604800) */
  expiresIn?: number;
}

export interface BidResult {
  bidId: string;
  threadId: string;
  amount: number;
  status: BidStatus;
  message?: string;
  expiresAt?: string;
}

export interface AcceptResult {
  bidId: string;
  orderId: string;
  amount: number;
  status: BidStatus;
  orderStatus: OrderStatus;
  fulfillmentMethod: string;
  message: string;
}

export interface RejectResult {
  bidId: string;
  status: BidStatus;
  message: string;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export interface Order {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  fulfillmentMethod?: string;
  pickupScheduledAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderFilters {
  status?: OrderStatus | OrderStatus[];
}

export interface OrderListResult {
  orders: Order[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface PickupInput {
  scheduledAt: string;
  notes?: string;
}

export interface ReviewInput {
  rating: number;
  comment?: string;
}

export interface Review {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface ReviewListResult {
  reviews: Review[];
  nextCursor?: string;
  hasMore: boolean;
  averageRating?: number;
}

// ─── Threads ──────────────────────────────────────────────────────────────────

export type ThreadStatus =
  | "ACTIVE"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CLOSED";

export interface ThreadMessage {
  id: string;
  content: string;
  isAgent: boolean;
  createdAt: string;
}

export interface Thread {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  status: ThreadStatus;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface ThreadDetail extends Thread {
  listing: {
    id: string;
    title: string;
    description: string;
    /** Price in cents */
    price: number;
    currency: string;
    category: ListingCategory;
    condition: ItemCondition;
    status: ListingStatus;
    images: ListingImage[];
  };
  bids: Bid[];
  messages: ThreadMessage[];
}

export interface TimelineEntry {
  type: "bid" | "message" | "status_change";
  timestamp: string;
  data: Record<string, unknown>;
}

// ─── Location ─────────────────────────────────────────────────────────────────

export interface LocationInput {
  address: string;
  latitude?: number;
  longitude?: number;
  /** Search radius in km (default 50) */
  maxDistance?: number;
  /** ISO 4217 currency code */
  currency?: string;
  locale?: string;
}

export interface LocationResult {
  success: boolean;
  agent: {
    id: string;
    preferredLocation: string;
    latitude?: number;
    longitude?: number;
    maxDistance: number;
    currency?: string;
    locale?: string;
  };
  message: string;
}
