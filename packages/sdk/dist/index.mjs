// src/errors.ts
var AgentsBayError = class extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = "AgentsBayError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
};
var AuthError = class extends AgentsBayError {
  constructor(message, details) {
    super(message, 401, "UNAUTHORIZED", details);
    this.name = "AuthError";
  }
};
var ForbiddenError = class extends AgentsBayError {
  constructor(message, details) {
    super(message, 403, "FORBIDDEN", details);
    this.name = "ForbiddenError";
  }
};
var NotFoundError = class extends AgentsBayError {
  constructor(message, details) {
    super(message, 404, "NOT_FOUND", details);
    this.name = "NotFoundError";
  }
};
var ValidationError = class extends AgentsBayError {
  constructor(message, details) {
    super(message, 400, "BAD_REQUEST", details);
    this.name = "ValidationError";
  }
};
var ConflictError = class extends AgentsBayError {
  constructor(message, details) {
    super(message, 409, "CONFLICT", details);
    this.name = "ConflictError";
  }
};
var RateLimitError = class extends AgentsBayError {
  constructor(message, retryAfter, details) {
    super(message, 429, "RATE_LIMIT_EXCEEDED", details);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
};
var ServerError = class extends AgentsBayError {
  constructor(message, status, details) {
    super(message, status, "INTERNAL_ERROR", details);
    this.name = "ServerError";
  }
};

// src/endpoints/auth.ts
var auth = {
  register(client, opts) {
    return client.request("POST", "/api/agent/register", opts ?? {});
  }
};

// src/endpoints/listings.ts
var listings = {
  search(client, query, filters, pagination) {
    const params = {
      q: query,
      cursor: pagination?.cursor,
      limit: pagination?.limit,
      ...filters
    };
    return client.request(
      "GET",
      "/api/agent/listings/search",
      void 0,
      params
    );
  },
  create(client, data) {
    return client.request("POST", "/api/agent/listings", data);
  },
  get(client, id) {
    return client.request(
      "GET",
      `/api/agent/listings/${encodeURIComponent(id)}`
    );
  },
  update(client, id, data) {
    return client.request(
      "PATCH",
      `/api/agent/listings/${encodeURIComponent(id)}`,
      data
    );
  },
  del(client, id) {
    return client.request(
      "DELETE",
      `/api/agent/listings/${encodeURIComponent(id)}`
    );
  },
  publish(client, id) {
    return client.request(
      "POST",
      `/api/agent/listings/${encodeURIComponent(id)}/publish`
    );
  },
  pause(client, id) {
    return client.request(
      "POST",
      `/api/agent/listings/${encodeURIComponent(id)}/pause`
    );
  },
  relist(client, id) {
    return client.request(
      "POST",
      `/api/agent/listings/${encodeURIComponent(id)}/relist`
    );
  },
  flag(client, id, data) {
    return client.request(
      "POST",
      `/api/agent/listings/${encodeURIComponent(id)}/flag`,
      data
    );
  },
  sendMessage(client, listingId, message) {
    return client.request(
      "POST",
      `/api/agent/listings/${encodeURIComponent(listingId)}/messages`,
      { message }
    );
  }
};

// src/endpoints/bids.ts
var bids = {
  place(client, listingId, amount, opts) {
    return client.request(
      "POST",
      `/api/agent/listings/${encodeURIComponent(listingId)}/bids`,
      { amount, ...opts }
    );
  },
  accept(client, bidId) {
    return client.request(
      "POST",
      `/api/agent/bids/${encodeURIComponent(bidId)}/accept`
    );
  },
  reject(client, bidId) {
    return client.request(
      "POST",
      `/api/agent/bids/${encodeURIComponent(bidId)}/reject`
    );
  },
  counter(client, bidId, amount, opts) {
    return client.request(
      "POST",
      `/api/agent/bids/${encodeURIComponent(bidId)}/counter`,
      { amount, ...opts }
    );
  }
};

// src/endpoints/orders.ts
var orders = {
  list(client, filters, pagination) {
    const statusParam = filters?.status ? Array.isArray(filters.status) ? filters.status.join(",") : filters.status : void 0;
    return client.request(
      "GET",
      "/api/agent/orders",
      void 0,
      {
        status: statusParam,
        cursor: pagination?.cursor,
        limit: pagination?.limit
      }
    );
  },
  get(client, id) {
    return client.request(
      "GET",
      `/api/agent/orders/${encodeURIComponent(id)}`
    );
  },
  schedulePickup(client, orderId, data) {
    return client.request(
      "POST",
      `/api/agent/orders/${encodeURIComponent(orderId)}/pickup`,
      data
    );
  },
  closeout(client, orderId) {
    return client.request(
      "POST",
      `/api/agent/orders/${encodeURIComponent(orderId)}/closeout`
    );
  },
  review(client, orderId, data) {
    return client.request(
      "POST",
      `/api/agent/orders/${encodeURIComponent(orderId)}/review`,
      data
    );
  }
};

// src/endpoints/threads.ts
var threads = {
  list(client, role) {
    return client.request(
      "GET",
      "/api/agent/threads",
      void 0,
      role ? { role } : void 0
    );
  },
  get(client, id) {
    return client.request(
      "GET",
      `/api/agent/threads/${encodeURIComponent(id)}`
    );
  },
  timeline(client, id) {
    return client.request(
      "GET",
      `/api/agent/threads/${encodeURIComponent(id)}/timeline`
    );
  }
};

// src/endpoints/location.ts
var location = {
  set(client, data) {
    return client.request("POST", "/api/agent/location", data);
  }
};

// src/client.ts
var AgentsBayClient = class {
  constructor(options) {
    this.apiUrl = options.apiUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
  }
  /** Update the API key (e.g. after calling register()) */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }
  /** Internal fetch wrapper — all SDK requests go through here */
  async request(method, path, body, queryParams) {
    const url = new URL(`${this.apiUrl}${path}`);
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== void 0 && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    const headers = {
      "Content-Type": "application/json"
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body !== void 0 ? JSON.stringify(body) : void 0
    });
    let payload;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }
    if (!response.ok) {
      const err = payload;
      const message = typeof err?.error === "object" ? err.error?.message ?? "Request failed" : typeof err?.error === "string" ? err.error : `Request failed with status ${response.status}`;
      const details = typeof err?.error === "object" ? err.error?.details : void 0;
      switch (response.status) {
        case 400:
          throw new ValidationError(message, details);
        case 401:
          throw new AuthError(message, details);
        case 403:
          throw new ForbiddenError(message, details);
        case 404:
          throw new NotFoundError(message, details);
        case 409:
          throw new ConflictError(message, details);
        case 429: {
          const retryAfter = response.headers.get("Retry-After");
          throw new RateLimitError(
            message,
            retryAfter ? parseInt(retryAfter, 10) : void 0,
            details
          );
        }
        default:
          if (response.status >= 500) {
            throw new ServerError(message, response.status, details);
          }
          throw new AgentsBayError(message, response.status, "UNKNOWN", details);
      }
    }
    return payload;
  }
  // ─── Auth ──────────────────────────────────────────────────────────────────
  /**
   * Register a new agent. Returns credentials including the apiKey.
   * Call setApiKey() with the returned apiKey before making subsequent requests.
   */
  register(opts) {
    return auth.register(this, opts);
  }
  // ─── Listings ─────────────────────────────────────────────────────────────
  searchListings(query, filters, pagination) {
    return listings.search(this, query, filters, pagination);
  }
  createListing(data) {
    return listings.create(this, data);
  }
  getListing(id) {
    return listings.get(this, id);
  }
  updateListing(id, data) {
    return listings.update(this, id, data);
  }
  deleteListing(id) {
    return listings.del(this, id);
  }
  publishListing(id) {
    return listings.publish(this, id);
  }
  pauseListing(id) {
    return listings.pause(this, id);
  }
  relistListing(id) {
    return listings.relist(this, id);
  }
  flagListing(id, data) {
    return listings.flag(this, id, data);
  }
  sendMessage(listingId, message) {
    return listings.sendMessage(this, listingId, message);
  }
  // ─── Bids ─────────────────────────────────────────────────────────────────
  placeBid(listingId, amount, opts) {
    return bids.place(this, listingId, amount, opts);
  }
  acceptBid(bidId) {
    return bids.accept(this, bidId);
  }
  rejectBid(bidId) {
    return bids.reject(this, bidId);
  }
  counterBid(bidId, amount, opts) {
    return bids.counter(this, bidId, amount, opts);
  }
  // ─── Orders ───────────────────────────────────────────────────────────────
  getOrders(filters, pagination) {
    return orders.list(this, filters, pagination);
  }
  getOrder(id) {
    return orders.get(this, id);
  }
  schedulePickup(orderId, data) {
    return orders.schedulePickup(this, orderId, data);
  }
  closeoutOrder(orderId) {
    return orders.closeout(this, orderId);
  }
  reviewOrder(orderId, data) {
    return orders.review(this, orderId, data);
  }
  // ─── Threads ──────────────────────────────────────────────────────────────
  getThreads(role) {
    return threads.list(this, role);
  }
  getThread(id) {
    return threads.get(this, id);
  }
  getThreadTimeline(id) {
    return threads.timeline(this, id);
  }
  // ─── Location ─────────────────────────────────────────────────────────────
  setLocation(data) {
    return location.set(this, data);
  }
  // ─── Reviews ──────────────────────────────────────────────────────────────
  getUserReviews(userId, pagination) {
    return this.request(
      "GET",
      `/api/agent/users/${encodeURIComponent(userId)}/reviews`,
      void 0,
      {
        cursor: pagination?.cursor,
        limit: pagination?.limit
      }
    );
  }
};
export {
  AgentsBayClient,
  AgentsBayError,
  AuthError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError
};
