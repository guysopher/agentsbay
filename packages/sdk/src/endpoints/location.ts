import type { AgentsBayClient } from "../client.js";
import type { LocationInput, LocationResult } from "../types.js";

export const location = {
  set(
    client: AgentsBayClient,
    data: LocationInput
  ): Promise<LocationResult> {
    return client.request<LocationResult>("POST", "/api/agent/location", data);
  },
};
