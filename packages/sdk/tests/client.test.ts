import { describe, it, expect, vi, afterEach } from "vitest";
import { AgentsBayClient } from "../src/client.js";
import {
  AuthError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
} from "../src/errors.js";
import { createClient, mockFetch, TEST_API_URL, TEST_API_KEY } from "./helpers.js";

afterEach(() => vi.restoreAllMocks());

describe("AgentsBayClient constructor", () => {
  it("strips trailing slash from apiUrl", () => {
    const client = new AgentsBayClient({ apiUrl: "https://example.com/" });
    expect(client.apiUrl).toBe("https://example.com");
  });
});

describe("request — auth header injection", () => {
  it("sends Bearer token when apiKey is set", async () => {
    const spy = mockFetch(200, { ok: true });
    const client = createClient();
    await client.request("GET", "/api/agent/test");
    expect(spy).toHaveBeenCalledOnce();
    const [, init] = spy.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: `Bearer ${TEST_API_KEY}`,
    });
  });

  it("omits Authorization header when no apiKey", async () => {
    const spy = mockFetch(200, { ok: true });
    const client = new AgentsBayClient({ apiUrl: TEST_API_URL });
    await client.request("GET", "/api/agent/test");
    const [, init] = spy.mock.calls[0];
    expect((init as RequestInit & { headers: Record<string, string> }).headers).not.toHaveProperty("Authorization");
  });
});

describe("request — query params", () => {
  it("appends defined query params to the URL", async () => {
    const spy = mockFetch(200, {});
    const client = createClient();
    await client.request("GET", "/api/agent/listings/search", undefined, {
      q: "bike",
      limit: 10,
      cursor: undefined, // should be omitted
    });
    const [url] = spy.mock.calls[0];
    expect(url).toContain("q=bike");
    expect(url).toContain("limit=10");
    expect(url).not.toContain("cursor");
  });
});

describe("request — error mapping", () => {
  it("throws ValidationError on 400", async () => {
    mockFetch(400, { error: { message: "Bad input", details: {} } });
    await expect(createClient().request("POST", "/api/agent/test", {})).rejects.toThrow(ValidationError);
  });

  it("throws AuthError on 401", async () => {
    mockFetch(401, { error: { message: "Unauthorized" } });
    await expect(createClient().request("GET", "/api/agent/test")).rejects.toThrow(AuthError);
  });

  it("throws NotFoundError on 404", async () => {
    mockFetch(404, { error: { message: "Not found" } });
    await expect(createClient().request("GET", "/api/agent/test")).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError on 409", async () => {
    mockFetch(409, { error: { message: "Conflict" } });
    await expect(createClient().request("POST", "/api/agent/test", {})).rejects.toThrow(ConflictError);
  });

  it("throws RateLimitError on 429 with retryAfter from header", async () => {
    mockFetch(429, { error: { message: "Too many requests" } }, { "Retry-After": "30" });
    const err = await createClient().request("GET", "/api/agent/test").catch((e) => e) as RateLimitError;
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfter).toBe(30);
  });

  it("throws ServerError on 500", async () => {
    mockFetch(500, { error: { message: "Internal error" } });
    await expect(createClient().request("GET", "/api/agent/test")).rejects.toThrow(ServerError);
  });
});

describe("setApiKey", () => {
  it("updates the API key used in subsequent requests", async () => {
    const client = new AgentsBayClient({ apiUrl: TEST_API_URL });
    client.setApiKey("sk_test_newkey");
    const spy = mockFetch(200, {});
    await client.request("GET", "/api/agent/test");
    const [, init] = spy.mock.calls[0];
    expect((init as RequestInit & { headers: Record<string, string> }).headers).toMatchObject({
      Authorization: "Bearer sk_test_newkey",
    });
  });
});
