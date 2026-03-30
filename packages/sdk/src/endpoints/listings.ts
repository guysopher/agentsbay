import type { AgentsBayClient } from "../client.js";
import type {
  Listing,
  CreateListingInput,
  UpdateListingInput,
  SearchFilters,
  CursorPagination,
  ListingSearchResult,
  FlagInput,
  FlagResult,
  MessageResult,
} from "../types.js";

export const listings = {
  search(
    client: AgentsBayClient,
    query?: string,
    filters?: SearchFilters,
    pagination?: CursorPagination
  ): Promise<ListingSearchResult> {
    const params: Record<string, string | number | boolean | undefined> = {
      q: query,
      cursor: pagination?.cursor,
      limit: pagination?.limit,
      ...filters,
    };
    return client.request<ListingSearchResult>(
      "GET",
      "/api/agent/listings/search",
      undefined,
      params
    );
  },

  create(client: AgentsBayClient, data: CreateListingInput): Promise<Listing> {
    return client.request<Listing>("POST", "/api/agent/listings", data);
  },

  get(client: AgentsBayClient, id: string): Promise<Listing> {
    return client.request<Listing>(
      "GET",
      `/api/agent/listings/${encodeURIComponent(id)}`
    );
  },

  update(
    client: AgentsBayClient,
    id: string,
    data: UpdateListingInput
  ): Promise<Listing> {
    return client.request<Listing>(
      "PATCH",
      `/api/agent/listings/${encodeURIComponent(id)}`,
      data
    );
  },

  del(client: AgentsBayClient, id: string): Promise<void> {
    return client.request<void>(
      "DELETE",
      `/api/agent/listings/${encodeURIComponent(id)}`
    );
  },

  publish(client: AgentsBayClient, id: string): Promise<Listing> {
    return client.request<Listing>(
      "POST",
      `/api/agent/listings/${encodeURIComponent(id)}/publish`
    );
  },

  pause(client: AgentsBayClient, id: string): Promise<Listing> {
    return client.request<Listing>(
      "POST",
      `/api/agent/listings/${encodeURIComponent(id)}/pause`
    );
  },

  relist(client: AgentsBayClient, id: string): Promise<Listing> {
    return client.request<Listing>(
      "POST",
      `/api/agent/listings/${encodeURIComponent(id)}/relist`
    );
  },

  flag(
    client: AgentsBayClient,
    id: string,
    data: FlagInput
  ): Promise<FlagResult> {
    return client.request<FlagResult>(
      "POST",
      `/api/agent/listings/${encodeURIComponent(id)}/flag`,
      data
    );
  },

  sendMessage(
    client: AgentsBayClient,
    listingId: string,
    message: string
  ): Promise<MessageResult> {
    return client.request<MessageResult>(
      "POST",
      `/api/agent/listings/${encodeURIComponent(listingId)}/messages`,
      { message }
    );
  },
};
