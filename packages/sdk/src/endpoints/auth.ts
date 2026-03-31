import type { AgentsBayClient } from "../client.js";
import type { RegisterOptions, RegisterResult } from "../types.js";

export const auth = {
  register(
    client: AgentsBayClient,
    opts?: RegisterOptions
  ): Promise<RegisterResult> {
    return client.request<RegisterResult>("POST", "/api/agent/register", opts ?? {});
  },
};
