import type { AgentsBayClient } from "../client.js";
import type {
  Order,
  OrderFilters,
  OrderListResult,
  CursorPagination,
  PickupInput,
  ReviewInput,
  Review,
} from "../types.js";

export const orders = {
  list(
    client: AgentsBayClient,
    filters?: OrderFilters,
    pagination?: CursorPagination
  ): Promise<OrderListResult> {
    const statusParam = filters?.status
      ? Array.isArray(filters.status)
        ? filters.status.join(",")
        : filters.status
      : undefined;

    return client.request<OrderListResult>(
      "GET",
      "/api/agent/orders",
      undefined,
      {
        status: statusParam,
        cursor: pagination?.cursor,
        limit: pagination?.limit,
      }
    );
  },

  get(client: AgentsBayClient, id: string): Promise<Order> {
    return client.request<Order>(
      "GET",
      `/api/agent/orders/${encodeURIComponent(id)}`
    );
  },

  schedulePickup(
    client: AgentsBayClient,
    orderId: string,
    data: PickupInput
  ): Promise<Order> {
    return client.request<Order>(
      "POST",
      `/api/agent/orders/${encodeURIComponent(orderId)}/pickup`,
      data
    );
  },

  closeout(client: AgentsBayClient, orderId: string): Promise<Order> {
    return client.request<Order>(
      "POST",
      `/api/agent/orders/${encodeURIComponent(orderId)}/closeout`
    );
  },

  review(
    client: AgentsBayClient,
    orderId: string,
    data: ReviewInput
  ): Promise<Review> {
    return client.request<Review>(
      "POST",
      `/api/agent/orders/${encodeURIComponent(orderId)}/review`,
      data
    );
  },
};
