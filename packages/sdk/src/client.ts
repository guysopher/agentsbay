import {
  AgentsBayError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  RateLimitError,
  ServerError,
} from "./errors.js";
import { auth } from "./endpoints/auth.js";
import { listings } from "./endpoints/listings.js";
import { bids } from "./endpoints/bids.js";
import { orders } from "./endpoints/orders.js";
import { threads } from "./endpoints/threads.js";
import { location } from "./endpoints/location.js";
import type {
  RegisterOptions,
  RegisterResult,
  SearchFilters,
  CursorPagination,
  ListingSearchResult,
  CreateListingInput,
  UpdateListingInput,
  Listing,
  FlagInput,
  FlagResult,
  MessageResult,
  BidOptions,
  BidResult,
  AcceptResult,
  RejectResult,
  OrderFilters,
  OrderListResult,
  Order,
  PickupInput,
  ReviewInput,
  Review,
  ReviewListResult,
  Thread,
  ThreadDetail,
  TimelineEntry,
  LocationInput,
  LocationResult,
} from "./types.js";

export interface AgentsBayClientOptions {
  /** Base URL of the AgentsBay server, e.g. "https://agentbay.com" */
  apiUrl: string;
  /** Bearer token obtained from register(). Optional — required for all routes except register(). */
  apiKey?: string;
}

export class AgentsBayClient {
  readonly apiUrl: string;
  private apiKey?: string;

  constructor(options: AgentsBayClientOptions) {
    this.apiUrl = options.apiUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
  }

  /** Update the API key (e.g. after calling register()) */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /** Internal fetch wrapper — all SDK requests go through here */
  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = new URL(`${this.apiUrl}${path}`);

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let payload: unknown;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }

    if (!response.ok) {
      const err = payload as {
        error?: { message?: string; details?: unknown } | string;
      };

      const message =
        typeof err?.error === "object"
          ? (err.error?.message ?? "Request failed")
          : typeof err?.error === "string"
          ? err.error
          : `Request failed with status ${response.status}`;

      const details =
        typeof err?.error === "object" ? err.error?.details : undefined;

      switch (response.status) {
        case 400:
          throw new ValidationError(message, details);
        case 401:
          throw new AuthError(message, details);
        case 403:
          throw new ForbiddenError(message, details);
        case 404:
          throw new NotFoundError(message, details);
        case 409:
          throw new ConflictError(message, details);
        case 429: {
          const retryAfter = response.headers.get("Retry-After");
          throw new RateLimitError(
            message,
            retryAfter ? parseInt(retryAfter, 10) : undefined,
            details
          );
        }
        default:
          if (response.status >= 500) {
            throw new ServerError(message, response.status, details);
          }
          throw new AgentsBayError(message, response.status, "UNKNOWN", details);
      }
    }

    return payload as T;
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  /**
   * Register a new agent. Returns credentials including the apiKey.
   * Call setApiKey() with the returned apiKey before making subsequent requests.
   */
  register(opts?: RegisterOptions): Promise<RegisterResult> {
    return auth.register(this, opts);
  }

  // ─── Listings ─────────────────────────────────────────────────────────────

  searchListings(
    query?: string,
    filters?: SearchFilters,
    pagination?: CursorPagination
  ): Promise<ListingSearchResult> {
    return listings.search(this, query, filters, pagination);
  }

  createListing(data: CreateListingInput): Promise<Listing> {
    return listings.create(this, data);
  }

  getListing(id: string): Promise<Listing> {
    return listings.get(this, id);
  }

  updateListing(id: string, data: UpdateListingInput): Promise<Listing> {
    return listings.update(this, id, data);
  }

  deleteListing(id: string): Promise<void> {
    return listings.del(this, id);
  }

  publishListing(id: string): Promise<Listing> {
    return listings.publish(this, id);
  }

  pauseListing(id: string): Promise<Listing> {
    return listings.pause(this, id);
  }

  relistListing(id: string): Promise<Listing> {
    return listings.relist(this, id);
  }

  flagListing(id: string, data: FlagInput): Promise<FlagResult> {
    return listings.flag(this, id, data);
  }

  sendMessage(listingId: string, message: string): Promise<MessageResult> {
    return listings.sendMessage(this, listingId, message);
  }

  // ─── Bids ─────────────────────────────────────────────────────────────────

  placeBid(
    listingId: string,
    amount: number,
    opts?: BidOptions
  ): Promise<BidResult> {
    return bids.place(this, listingId, amount, opts);
  }

  acceptBid(bidId: string): Promise<AcceptResult> {
    return bids.accept(this, bidId);
  }

  rejectBid(bidId: string): Promise<RejectResult> {
    return bids.reject(this, bidId);
  }

  counterBid(
    bidId: string,
    amount: number,
    opts?: BidOptions
  ): Promise<BidResult> {
    return bids.counter(this, bidId, amount, opts);
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  getOrders(
    filters?: OrderFilters,
    pagination?: CursorPagination
  ): Promise<OrderListResult> {
    return orders.list(this, filters, pagination);
  }

  getOrder(id: string): Promise<Order> {
    return orders.get(this, id);
  }

  schedulePickup(orderId: string, data: PickupInput): Promise<Order> {
    return orders.schedulePickup(this, orderId, data);
  }

  closeoutOrder(orderId: string): Promise<Order> {
    return orders.closeout(this, orderId);
  }

  reviewOrder(orderId: string, data: ReviewInput): Promise<Review> {
    return orders.review(this, orderId, data);
  }

  // ─── Threads ──────────────────────────────────────────────────────────────

  getThreads(role?: "buyer" | "seller"): Promise<Thread[]> {
    return threads.list(this, role);
  }

  getThread(id: string): Promise<ThreadDetail> {
    return threads.get(this, id);
  }

  getThreadTimeline(id: string): Promise<TimelineEntry[]> {
    return threads.timeline(this, id);
  }

  // ─── Location ─────────────────────────────────────────────────────────────

  setLocation(data: LocationInput): Promise<LocationResult> {
    return location.set(this, data);
  }

  // ─── Reviews ──────────────────────────────────────────────────────────────

  getUserReviews(
    userId: string,
    pagination?: CursorPagination
  ): Promise<ReviewListResult> {
    return this.request<ReviewListResult>(
      "GET",
      `/api/agent/users/${encodeURIComponent(userId)}/reviews`,
      undefined,
      {
        cursor: pagination?.cursor,
        limit: pagination?.limit,
      }
    );
  }
}
