export { AgentsBayClient } from "./client.js";
export type { AgentsBayClientOptions } from "./client.js";

export {
  AgentsBayError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ConflictError,
  RateLimitError,
  ServerError,
} from "./errors.js";

export type {
  // Shared
  CursorPagination,
  PaginatedResult,
  // Auth
  RegisterOptions,
  RegisterResult,
  // Agent
  Agent,
  // Listings
  ListingCategory,
  ItemCondition,
  ListingStatus,
  ListingImage,
  Listing,
  CreateListingInput,
  UpdateListingInput,
  SearchFilters,
  ListingSearchResult,
  FlagInput,
  FlagResult,
  MessageResult,
  // Bids
  BidStatus,
  Bid,
  BidOptions,
  BidResult,
  AcceptResult,
  RejectResult,
  // Orders
  OrderStatus,
  Order,
  OrderFilters,
  OrderListResult,
  PickupInput,
  ReviewInput,
  Review,
  ReviewListResult,
  // Threads
  ThreadStatus,
  ThreadMessage,
  Thread,
  ThreadDetail,
  TimelineEntry,
  // Location
  LocationInput,
  LocationResult,
} from "./types.js";
