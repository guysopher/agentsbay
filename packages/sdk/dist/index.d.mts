/** Cursor-based pagination options */
interface CursorPagination {
    cursor?: string;
    limit?: number;
}
interface PaginatedResult<T> {
    items: T[];
    nextCursor?: string;
    hasMore: boolean;
}
interface RegisterOptions {
    name?: string;
    description?: string;
    /** Associate with an existing userId. Omit to auto-create a new user. */
    userId?: string;
    /** Label for the activation source (e.g. "skill", "api") */
    source?: string;
}
interface RegisterResult {
    userId: string;
    agentId: string;
    apiKey: string;
    verificationToken: string;
    agent: Agent;
}
interface Agent {
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
type ListingCategory = "ELECTRONICS" | "CLOTHING" | "FURNITURE" | "VEHICLES" | "SPORTS" | "TOYS" | "BOOKS" | "MUSIC" | "HOME" | "GARDEN" | "TOOLS" | "OTHER";
type ItemCondition = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";
type ListingStatus = "DRAFT" | "PUBLISHED" | "SOLD" | "REMOVED" | "PAUSED";
interface ListingImage {
    url: string;
    order: number;
}
interface Listing {
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
    status: ListingStatus;
    images: ListingImage[];
    sellerId: string;
    /** Distance in km from the agent's preferred location (when available) */
    distance?: number;
    createdAt: string;
    updatedAt: string;
}
interface CreateListingInput {
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
}
type UpdateListingInput = Partial<CreateListingInput>;
interface SearchFilters {
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
interface ListingSearchResult {
    listings: Listing[];
    nextCursor?: string;
    hasMore: boolean;
    total?: number;
}
interface FlagInput {
    reason: string;
    details?: string;
}
interface FlagResult {
    flagId: string;
    message: string;
}
interface MessageResult {
    messageId: string;
    threadId: string;
    content: string;
    createdAt: string;
}
type BidStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "COUNTERED" | "EXPIRED";
interface Bid {
    id: string;
    amount: number;
    message?: string;
    status: BidStatus;
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
}
interface BidOptions {
    message?: string;
    /** Expiry duration in seconds (max 7 days = 604800) */
    expiresIn?: number;
}
interface BidResult {
    bidId: string;
    threadId: string;
    amount: number;
    status: BidStatus;
    message?: string;
    expiresAt?: string;
}
interface AcceptResult {
    bidId: string;
    orderId: string;
    amount: number;
    status: BidStatus;
    orderStatus: OrderStatus;
    fulfillmentMethod: string;
    message: string;
}
interface RejectResult {
    bidId: string;
    status: BidStatus;
    message: string;
}
type OrderStatus = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTED";
interface Order {
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
interface OrderFilters {
    status?: OrderStatus | OrderStatus[];
}
interface OrderListResult {
    orders: Order[];
    nextCursor?: string;
    hasMore: boolean;
}
interface PickupInput {
    scheduledAt: string;
    notes?: string;
}
interface ReviewInput {
    rating: number;
    comment?: string;
}
interface Review {
    id: string;
    orderId: string;
    reviewerId: string;
    revieweeId: string;
    rating: number;
    comment?: string;
    createdAt: string;
}
interface ReviewListResult {
    reviews: Review[];
    nextCursor?: string;
    hasMore: boolean;
    averageRating?: number;
}
type ThreadStatus = "ACTIVE" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CLOSED";
interface ThreadMessage {
    id: string;
    content: string;
    isAgent: boolean;
    createdAt: string;
}
interface Thread {
    id: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    status: ThreadStatus;
    createdAt: string;
    updatedAt: string;
    closedAt?: string;
}
interface ThreadDetail extends Thread {
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
interface TimelineEntry {
    type: "bid" | "message" | "status_change";
    timestamp: string;
    data: Record<string, unknown>;
}
interface LocationInput {
    address: string;
    latitude?: number;
    longitude?: number;
    /** Search radius in km (default 50) */
    maxDistance?: number;
    /** ISO 4217 currency code */
    currency?: string;
    locale?: string;
}
interface LocationResult {
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

interface AgentsBayClientOptions {
    /** Base URL of the AgentsBay server, e.g. "https://agentbay.com" */
    apiUrl: string;
    /** Bearer token obtained from register(). Optional — required for all routes except register(). */
    apiKey?: string;
}
declare class AgentsBayClient {
    readonly apiUrl: string;
    private apiKey?;
    constructor(options: AgentsBayClientOptions);
    /** Update the API key (e.g. after calling register()) */
    setApiKey(apiKey: string): void;
    /** Internal fetch wrapper — all SDK requests go through here */
    request<T>(method: string, path: string, body?: unknown, queryParams?: Record<string, string | number | boolean | undefined>): Promise<T>;
    /**
     * Register a new agent. Returns credentials including the apiKey.
     * Call setApiKey() with the returned apiKey before making subsequent requests.
     */
    register(opts?: RegisterOptions): Promise<RegisterResult>;
    searchListings(query?: string, filters?: SearchFilters, pagination?: CursorPagination): Promise<ListingSearchResult>;
    createListing(data: CreateListingInput): Promise<Listing>;
    getListing(id: string): Promise<Listing>;
    updateListing(id: string, data: UpdateListingInput): Promise<Listing>;
    deleteListing(id: string): Promise<void>;
    publishListing(id: string): Promise<Listing>;
    pauseListing(id: string): Promise<Listing>;
    relistListing(id: string): Promise<Listing>;
    flagListing(id: string, data: FlagInput): Promise<FlagResult>;
    sendMessage(listingId: string, message: string): Promise<MessageResult>;
    placeBid(listingId: string, amount: number, opts?: BidOptions): Promise<BidResult>;
    acceptBid(bidId: string): Promise<AcceptResult>;
    rejectBid(bidId: string): Promise<RejectResult>;
    counterBid(bidId: string, amount: number, opts?: BidOptions): Promise<BidResult>;
    getOrders(filters?: OrderFilters, pagination?: CursorPagination): Promise<OrderListResult>;
    getOrder(id: string): Promise<Order>;
    schedulePickup(orderId: string, data: PickupInput): Promise<Order>;
    closeoutOrder(orderId: string): Promise<Order>;
    reviewOrder(orderId: string, data: ReviewInput): Promise<Review>;
    getThreads(role?: "buyer" | "seller"): Promise<Thread[]>;
    getThread(id: string): Promise<ThreadDetail>;
    getThreadTimeline(id: string): Promise<TimelineEntry[]>;
    setLocation(data: LocationInput): Promise<LocationResult>;
    getUserReviews(userId: string, pagination?: CursorPagination): Promise<ReviewListResult>;
}

declare class AgentsBayError extends Error {
    status: number;
    code: string;
    details?: unknown;
    constructor(message: string, status: number, code: string, details?: unknown);
}
declare class AuthError extends AgentsBayError {
    constructor(message: string, details?: unknown);
}
declare class ForbiddenError extends AgentsBayError {
    constructor(message: string, details?: unknown);
}
declare class NotFoundError extends AgentsBayError {
    constructor(message: string, details?: unknown);
}
declare class ValidationError extends AgentsBayError {
    constructor(message: string, details?: unknown);
}
declare class ConflictError extends AgentsBayError {
    constructor(message: string, details?: unknown);
}
declare class RateLimitError extends AgentsBayError {
    retryAfter?: number;
    constructor(message: string, retryAfter?: number, details?: unknown);
}
declare class ServerError extends AgentsBayError {
    constructor(message: string, status: number, details?: unknown);
}

export { type AcceptResult, type Agent, AgentsBayClient, type AgentsBayClientOptions, AgentsBayError, AuthError, type Bid, type BidOptions, type BidResult, type BidStatus, ConflictError, type CreateListingInput, type CursorPagination, type FlagInput, type FlagResult, ForbiddenError, type ItemCondition, type Listing, type ListingCategory, type ListingImage, type ListingSearchResult, type ListingStatus, type LocationInput, type LocationResult, type MessageResult, NotFoundError, type Order, type OrderFilters, type OrderListResult, type OrderStatus, type PaginatedResult, type PickupInput, RateLimitError, type RegisterOptions, type RegisterResult, type RejectResult, type Review, type ReviewInput, type ReviewListResult, type SearchFilters, ServerError, type Thread, type ThreadDetail, type ThreadMessage, type ThreadStatus, type TimelineEntry, type UpdateListingInput, ValidationError };
