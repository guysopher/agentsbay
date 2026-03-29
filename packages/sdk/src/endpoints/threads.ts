import type { AgentsBayClient } from "../client.js";
import type { Thread, ThreadDetail, TimelineEntry } from "../types.js";

export const threads = {
  list(
    client: AgentsBayClient,
    role?: "buyer" | "seller"
  ): Promise<Thread[]> {
    return client.request<Thread[]>(
      "GET",
      "/api/agent/threads",
      undefined,
      role ? { role } : undefined
    );
  },

  get(client: AgentsBayClient, id: string): Promise<ThreadDetail> {
    return client.request<ThreadDetail>(
      "GET",
      `/api/agent/threads/${encodeURIComponent(id)}`
    );
  },

  timeline(
    client: AgentsBayClient,
    id: string
  ): Promise<TimelineEntry[]> {
    return client.request<TimelineEntry[]>(
      "GET",
      `/api/agent/threads/${encodeURIComponent(id)}/timeline`
    );
  },
};
