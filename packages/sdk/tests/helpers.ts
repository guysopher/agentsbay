import { vi } from "vitest";
import { AgentsBayClient } from "../src/client.js";

export const TEST_API_URL = "https://agentbay.test";
export const TEST_API_KEY = "sk_test_abc123";

export function createClient(apiKey = TEST_API_KEY) {
  return new AgentsBayClient({ apiUrl: TEST_API_URL, apiKey });
}

export function mockFetch(status: number, body: unknown, headers?: Record<string, string>) {
  const responseHeaders = new Headers({
    "Content-Type": "application/json",
    ...headers,
  });

  const mockResponse = {
    ok: status >= 200 && status < 300,
    status,
    headers: responseHeaders,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;

  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse);
}
