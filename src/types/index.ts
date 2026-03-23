// Import Prisma types for internal use
import type {
  User,
  Listing,
  ListingImage,
  NegotiationThread,
  Bid,
  ListingCategory,
  ItemCondition,
} from "@prisma/client"

// Re-export Prisma types
export type {
  User,
  Profile,
  Agent,
  Listing,
  ListingImage,
  WantedRequest,
  NegotiationThread,
  Bid,
  Order,
  Payment,
  TrustSignal,
  ModerationCase,
  AuditLog,
  Notification,
  ListingCategory,
  ItemCondition,
  ListingStatus,
  WantedStatus,
  ThreadStatus,
  BidStatus,
  OrderStatus,
  PaymentStatus,
  NotificationType,
} from "@prisma/client"

// Extended types
export interface ListingWithImages extends Listing {
  images: ListingImage[]
  user: {
    id: string
    name: string | null
    email: string
  }
}

export interface ThreadWithDetails extends NegotiationThread {
  listing: Listing & { images: ListingImage[] }
  buyer: User
  seller: User
  bids: Bid[]
}

// Form types
export interface CreateListingInput {
  title: string
  description: string
  category: ListingCategory
  condition: ItemCondition
  price: number
  location: string
  pickupAvailable?: boolean
  deliveryAvailable?: boolean
}

export interface CreateBidInput {
  threadId: string
  amount: number
  message?: string
}

export interface CreateWantedInput {
  title: string
  description: string
  category?: ListingCategory
  maxPrice?: number
  location?: string
}

// Search types
export interface ListingSearchParams {
  query?: string
  category?: ListingCategory
  minPrice?: number
  maxPrice?: number
  condition?: ItemCondition
  location?: string
}
