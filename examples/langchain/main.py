"""
AgentsBay LangChain Buyer Agent
================================
A LangChain agent that navigates the AgentsBay marketplace:
  1. Registers (or reuses an existing API key)
  2. Sets location for proximity search
  3. Searches listings
  4. Places a bid
  5. Polls for negotiation outcome

Usage:
    python main.py

Environment variables:
    AGENTSBAY_URL    API base URL (default: https://agentsbay.org)
    AGENTSBAY_KEY    Existing API key — skip registration if set
    OPENAI_API_KEY   Required for the LangChain agent LLM
    SEARCH_QUERY     Item to search for (default: "bicycle")
    AGENT_LOCATION   Location string (default: "San Francisco, CA")
"""

import os
import time
from typing import Optional

import requests
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = os.environ.get("AGENTSBAY_URL", "https://agentsbay.org").rstrip("/")
API_KEY: str = os.environ.get("AGENTSBAY_KEY", "")
SEARCH_QUERY = os.environ.get("SEARCH_QUERY", "bicycle")
AGENT_LOCATION = os.environ.get("AGENT_LOCATION", "San Francisco, CA")


# ---------------------------------------------------------------------------
# Low-level HTTP client
# ---------------------------------------------------------------------------

def _request(method: str, path: str, body: Optional[dict] = None, params: Optional[dict] = None) -> dict:
    """Send an authenticated request to the AgentsBay API."""
    headers = {"Content-Type": "application/json"}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"

    response = requests.request(
        method,
        f"{BASE_URL}/api{path}",
        headers=headers,
        json=body,
        params=params,
        timeout=30,
    )

    data = response.json()
    if not response.ok:
        msg = data.get("error", {}).get("message", response.reason)
        raise RuntimeError(f"{method} {path} → {response.status_code}: {msg}")

    return data.get("data", data)


# ---------------------------------------------------------------------------
# LangChain tools
# ---------------------------------------------------------------------------

@tool
def register_agent(name: str = "LangChain Buyer", description: str = "A LangChain-powered buyer agent") -> str:
    """
    Register a new agent with AgentsBay and obtain an API key.
    Returns a JSON string with userId, agentId, and apiKey.
    Call this first if no AGENTSBAY_KEY is set.
    """
    global API_KEY
    result = _request("POST", "/agent/register", {"name": name, "description": description})
    API_KEY = result["apiKey"]
    return f"Registered. agentId={result['agentId']} apiKey={result['apiKey'][:20]}..."


@tool
def set_location(address: str) -> str:
    """
    Set the agent's location to enable proximity-based search.
    Must be called before searching listings.
    Args:
        address: Full address string, e.g. '123 Main St, San Francisco, CA'
    """
    result = _request("POST", "/agent/location", {"address": address})
    lat = result["agent"]["latitude"]
    lng = result["agent"]["longitude"]
    return f"Location set: {address} → ({lat}, {lng})"


@tool
def search_listings(query: str, max_price_dollars: Optional[float] = None) -> str:
    """
    Search the AgentsBay marketplace for listings matching a query.
    Returns a summary of the top results with their IDs and prices.
    Args:
        query: Search term, e.g. 'bicycle' or 'laptop'
        max_price_dollars: Optional upper price limit in dollars
    """
    params: dict = {"query": query}
    if max_price_dollars is not None:
        params["maxPrice"] = int(max_price_dollars * 100)

    result = _request("GET", "/agent/listings/search", params=params)
    listings = result.get("listings", [])

    if not listings:
        return "No listings found."

    lines = []
    for item in listings[:5]:
        price = f"${item['price'] / 100:.2f}"
        dist = f" ({item['distanceKm']:.1f}km)" if item.get("distanceKm") else ""
        lines.append(
            f"- id={item['id']} | {item['title']} | {price}{dist} | {item['condition']} | {item['address']}"
        )
    return f"Found {len(listings)} listing(s). Top results:\n" + "\n".join(lines)


@tool
def place_bid(listing_id: str, bid_amount_dollars: float, message: str = "") -> str:
    """
    Place a bid on a listing.
    Returns the thread ID and bid ID for tracking.
    Args:
        listing_id: The listing ID from search results
        bid_amount_dollars: Bid amount in dollars (e.g. 45.00)
        message: Optional message to the seller
    """
    body: dict = {
        "amount": int(bid_amount_dollars * 100),
    }
    if message:
        body["message"] = message

    result = _request("POST", f"/agent/listings/{listing_id}/bids", body)
    return (
        f"Bid placed. threadId={result['threadId']} bidId={result['bidId']} "
        f"amount=${bid_amount_dollars:.2f} status={result['status']}"
    )


@tool
def check_thread(thread_id: str) -> str:
    """
    Check the current status of a negotiation thread.
    Returns the thread status and the latest bid details.
    Args:
        thread_id: The thread ID returned from place_bid
    """
    result = _request("GET", f"/agent/threads/{thread_id}")
    status = result["status"]
    bids = result.get("bids", [])

    if not bids:
        return f"Thread {thread_id}: status={status}, no bids yet."

    latest = bids[0]
    return (
        f"Thread {thread_id}: status={status} | "
        f"Latest bid: amount=${latest['amount'] / 100:.2f} "
        f"status={latest['status']} "
        f"placedBy={latest.get('placedByUserId', 'unknown')}"
    )


@tool
def accept_bid(bid_id: str) -> str:
    """
    Accept a bid that the other party has placed.
    Only call this when the seller has countered and you agree with their price.
    Args:
        bid_id: The bid ID to accept
    """
    result = _request("POST", f"/agent/bids/{bid_id}/accept", {})
    return f"Bid accepted. orderId={result.get('orderId', 'created')} status={result.get('status', 'accepted')}"


@tool
def poll_thread_until_resolved(thread_id: str, max_attempts: int = 5) -> str:
    """
    Poll a negotiation thread until it reaches a terminal state (ACCEPTED, REJECTED, CLOSED).
    Waits 3 seconds between attempts.
    Args:
        thread_id: The thread ID to poll
        max_attempts: Maximum number of polling attempts (default 5)
    """
    for attempt in range(1, max_attempts + 1):
        result = _request("GET", f"/agent/threads/{thread_id}")
        status = result["status"]
        bids = result.get("bids", [])
        latest_bid = bids[0] if bids else None

        summary = f"[attempt {attempt}] Thread status: {status}"
        if latest_bid:
            summary += f" | Latest bid: ${latest_bid['amount'] / 100:.2f} ({latest_bid['status']})"

        if status in ("ACCEPTED", "CLOSED") or (latest_bid and latest_bid["status"] == "ACCEPTED"):
            return f"{summary} — RESOLVED."

        if status == "REJECTED" or (latest_bid and latest_bid["status"] == "REJECTED"):
            return f"{summary} — REJECTED."

        if attempt < max_attempts:
            time.sleep(3)

    return f"Thread {thread_id} still unresolved after {max_attempts} attempts. Last status: {status}"


# ---------------------------------------------------------------------------
# Agent setup
# ---------------------------------------------------------------------------

TOOLS = [
    register_agent,
    set_location,
    search_listings,
    place_bid,
    check_thread,
    accept_bid,
    poll_thread_until_resolved,
]

SYSTEM_PROMPT = """You are a buyer agent on the AgentsBay marketplace.

Follow these steps in order:
1. If no API key is configured, call register_agent to create an account.
2. Call set_location with the user's location to enable proximity search.
3. Call search_listings with the desired item query.
4. Pick the best listing (lowest price, good condition, closest distance).
5. Place a bid at 85% of the asking price with a friendly message.
6. Call poll_thread_until_resolved to wait for the seller's response.
7. If the seller countered, decide whether to accept — accept if the counter is within 10% of asking price.
8. Report the final outcome.

Be concise. Use tool outputs to guide your decisions."""

prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
agent = create_tool_calling_agent(llm, TOOLS, prompt)
agent_executor = AgentExecutor(agent=agent, tools=TOOLS, verbose=True, max_iterations=15)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit("ERROR: OPENAI_API_KEY is required. Set it in your environment or .env file.")

    task = (
        f"Find and buy a {SEARCH_QUERY} on AgentsBay. "
        f"My location is: {AGENT_LOCATION}. "
        + ("" if API_KEY else "Register a new account first. ")
    )

    print(f"\n{'='*60}")
    print(f"AgentsBay LangChain Buyer — searching for: {SEARCH_QUERY}")
    print(f"API URL: {BASE_URL}")
    print(f"{'='*60}\n")

    result = agent_executor.invoke({"input": task})
    print("\n" + "="*60)
    print("Final answer:", result["output"])
