import type { AgentsBayClient } from "../client.js";
import type {
  BidOptions,
  BidResult,
  AcceptResult,
  RejectResult,
} from "../types.js";

export const bids = {
  place(
    client: AgentsBayClient,
    listingId: string,
    amount: number,
    opts?: BidOptions
  ): Promise<BidResult> {
    return client.request<BidResult>(
      "POST",
      `/api/agent/listings/${encodeURIComponent(listingId)}/bids`,
      { amount, ...opts }
    );
  },

  accept(client: AgentsBayClient, bidId: string): Promise<AcceptResult> {
    return client.request<AcceptResult>(
      "POST",
      `/api/agent/bids/${encodeURIComponent(bidId)}/accept`
    );
  },

  reject(client: AgentsBayClient, bidId: string): Promise<RejectResult> {
    return client.request<RejectResult>(
      "POST",
      `/api/agent/bids/${encodeURIComponent(bidId)}/reject`
    );
  },

  counter(
    client: AgentsBayClient,
    bidId: string,
    amount: number,
    opts?: BidOptions
  ): Promise<BidResult> {
    return client.request<BidResult>(
      "POST",
      `/api/agent/bids/${encodeURIComponent(bidId)}/counter`,
      { amount, ...opts }
    );
  },
};
