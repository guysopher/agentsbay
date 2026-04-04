#!/usr/bin/env bash
# verify-deploy.sh — Post-deploy health check for AgentsBay
#
# Usage:
#   BASE_URL=https://agentsbay.org ./scripts/verify-deploy.sh
#   BASE_URL=https://agentsbay.org AGENT_API_KEY=sk_test_... ./scripts/verify-deploy.sh
#   BASE_URL=https://agentsbay.org AGENT_API_KEY=sk_test_... LISTING_ID=<uuid> ./scripts/verify-deploy.sh
#
# Required:
#   BASE_URL        — Production base URL (no trailing slash)
#
# Optional (skips agent-auth checks if absent):
#   AGENT_API_KEY   — Agent API key (sk_test_...) for authenticated endpoint checks
#   LISTING_ID      — Listing UUID to bid on. If not set, script fetches the first published listing.
#   BID_AMOUNT      — Bid amount in cents (default: 100 = $1.00, the minimum)
#
# Exit codes:
#   0 — all checks passed
#   1 — one or more checks failed

set -euo pipefail

# ── Colour helpers ──────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0

pass()  { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)); }
fail()  { echo -e "  ${RED}✗${NC} $1"; ((FAIL++)); }
skip()  { echo -e "  ${YELLOW}–${NC} $1 ${YELLOW}(skipped)${NC}"; ((SKIP++)); }
info()  { echo -e "  ${BLUE}·${NC} $1"; }
header(){ echo -e "\n${BOLD}$1${NC}"; }

# ── Config ──────────────────────────────────────────────────────────────────
BASE_URL="${BASE_URL:-}"
AGENT_API_KEY="${AGENT_API_KEY:-}"
LISTING_ID="${LISTING_ID:-}"
BID_AMOUNT="${BID_AMOUNT:-100}"

if [[ -z "$BASE_URL" ]]; then
  echo -e "${RED}Error:${NC} BASE_URL is required."
  echo "  Usage: BASE_URL=https://agentsbay.org $0"
  exit 1
fi

# Strip trailing slash
BASE_URL="${BASE_URL%/}"

echo -e "\n${BOLD}AgentsBay Post-Deploy Verification${NC}"
echo "Base URL : $BASE_URL"
echo "Started  : $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "────────────────────────────────────"

# ── Helper: HTTP GET with status capture ────────────────────────────────────
# Usage: http_get <url> [extra curl args...]
# Sets global: HTTP_STATUS, HTTP_BODY
http_get() {
  local url="$1"; shift
  local tmp
  tmp=$(mktemp)
  HTTP_STATUS=$(curl -s -o "$tmp" -w "%{http_code}" --max-time 15 "$@" "$url")
  HTTP_BODY=$(cat "$tmp")
  rm -f "$tmp"
}

# Usage: http_post <url> <json_body> [extra curl args...]
# Sets global: HTTP_STATUS, HTTP_BODY
http_post() {
  local url="$1"
  local body="$2"; shift 2
  local tmp
  tmp=$(mktemp)
  HTTP_STATUS=$(curl -s -o "$tmp" -w "%{http_code}" --max-time 15 \
    -X POST -H "Content-Type: application/json" -d "$body" "$@" "$url")
  HTTP_BODY=$(cat "$tmp")
  rm -f "$tmp"
}

# ── Check 1: Health endpoint ─────────────────────────────────────────────────
header "1. Health"
http_get "$BASE_URL/api/health"
if [[ "$HTTP_STATUS" == "200" ]]; then
  DB_STATUS=$(echo "$HTTP_BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('database','?'))" 2>/dev/null || echo "?")
  pass "GET /api/health → 200 (database: $DB_STATUS)"
else
  fail "GET /api/health → $HTTP_STATUS (expected 200)"
  info "Response: $(echo "$HTTP_BODY" | head -c 300)"
fi

# ── Check 2: Auth session endpoint ───────────────────────────────────────────
header "2. Auth"
http_get "$BASE_URL/api/auth/session"
if [[ "$HTTP_STATUS" == "200" ]]; then
  pass "GET /api/auth/session → 200"
else
  fail "GET /api/auth/session → $HTTP_STATUS (expected 200)"
fi

# ── Check 3: Public listings returns results ─────────────────────────────────
header "3. Public listings"
http_get "$BASE_URL/api/listings?limit=5"
if [[ "$HTTP_STATUS" == "200" ]]; then
  LISTING_COUNT=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
items = d.get('data', {}).get('items', d.get('items', []))
print(len(items))
" 2>/dev/null || echo "?")
  pass "GET /api/listings → 200 ($LISTING_COUNT listings in first page)"
  if [[ "$LISTING_COUNT" == "0" || "$LISTING_COUNT" == "?" ]]; then
    info "Warning: zero listings returned — seed data may be missing"
  fi
else
  fail "GET /api/listings → $HTTP_STATUS (expected 200)"
  info "Response: $(echo "$HTTP_BODY" | head -c 300)"
fi

# ── Agent-auth checks (require AGENT_API_KEY) ────────────────────────────────
if [[ -z "$AGENT_API_KEY" ]]; then
  skip "Bid placement check (AGENT_API_KEY not set)"
  skip "sellerId UUID check (AGENT_API_KEY not set)"
  skip "Negotiation thread creation check (AGENT_API_KEY not set)"
else
  # Resolve LISTING_ID dynamically if not provided
  if [[ -z "$LISTING_ID" ]]; then
    info "LISTING_ID not set — fetching first available published listing..."
    http_get "$BASE_URL/api/listings?limit=1"
    if [[ "$HTTP_STATUS" == "200" ]]; then
      LISTING_ID=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
items = d.get('data', {}).get('items', d.get('items', []))
print(items[0]['id'] if items else '')
" 2>/dev/null || echo "")
    fi
    if [[ -z "$LISTING_ID" ]]; then
      skip "Bid placement check (no published listings found to bid on)"
      skip "sellerId UUID check (no listing available)"
      skip "Negotiation thread creation check (no listing available)"
      LISTING_ID=""
    fi
  fi

  if [[ -n "$LISTING_ID" ]]; then
    info "Using listing: $LISTING_ID"

    # ── Check 4: POST /api/agent/listings/:id/bids returns 201 ────────────────
    header "4. Bid placement (main fix)"
    BID_PAYLOAD="{\"amount\":$BID_AMOUNT,\"message\":\"Verify-deploy smoke test bid — safe to reject\"}"
    http_post "$BASE_URL/api/agent/listings/$LISTING_ID/bids" \
      "$BID_PAYLOAD" \
      -H "Authorization: Bearer $AGENT_API_KEY"

    if [[ "$HTTP_STATUS" == "201" ]]; then
      pass "POST /api/agent/listings/$LISTING_ID/bids → 201"

      # ── Check 5: sellerId is a UUID ──────────────────────────────────────
      header "5. sellerId format"
      SELLER_ID=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
data = d.get('data', d)
print(data.get('sellerId', ''))
" 2>/dev/null || echo "")

      UUID_REGEX='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      if [[ -z "$SELLER_ID" ]]; then
        info "sellerId not present in bid response (field may not be returned — check AGE-295 intent)"
        THREAD_ID=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
data = d.get('data', d)
print(data.get('threadId', ''))
" 2>/dev/null || echo "")
      elif echo "$SELLER_ID" | grep -qE "$UUID_REGEX"; then
        pass "sellerId is a valid UUID: $SELLER_ID"
      else
        fail "sellerId is NOT a UUID: '$SELLER_ID' (likely a test placeholder — fix not applied)"
      fi

      # ── Check 6: Negotiation thread was created ──────────────────────────
      header "6. Negotiation thread"
      THREAD_ID=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
data = d.get('data', d)
print(data.get('threadId', ''))
" 2>/dev/null || echo "")

      if [[ -n "$THREAD_ID" ]]; then
        pass "Negotiation thread created: $THREAD_ID"
      else
        fail "threadId missing from bid response (thread creation may have failed)"
        info "Response: $(echo "$HTTP_BODY" | head -c 400)"
      fi

    elif [[ "$HTTP_STATUS" == "400" ]]; then
      # 400 is expected if the agent is trying to bid on their own listing
      ERR_MSG=$(echo "$HTTP_BODY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('error', d.get('message', '')))
" 2>/dev/null || echo "")
      if echo "$ERR_MSG" | grep -qi "own\|seller\|yourself"; then
        pass "POST /api/agent/listings/$LISTING_ID/bids → 400 (agent is listing owner — expected)"
        info "Use a listing owned by a different user for full bid validation"
        skip "sellerId UUID check (bid rejected — agent owns listing)"
        skip "Negotiation thread check (bid rejected — agent owns listing)"
      else
        fail "POST /api/agent/listings/$LISTING_ID/bids → 400: $ERR_MSG"
        skip "sellerId UUID check"
        skip "Negotiation thread check"
      fi
    elif [[ "$HTTP_STATUS" == "500" ]]; then
      fail "POST /api/agent/listings/$LISTING_ID/bids → 500 — THE MAIN FIX IS NOT LIVE"
      info "Response: $(echo "$HTTP_BODY" | head -c 400)"
      skip "sellerId UUID check (bid failed)"
      skip "Negotiation thread check (bid failed)"
    else
      fail "POST /api/agent/listings/$LISTING_ID/bids → $HTTP_STATUS (unexpected)"
      info "Response: $(echo "$HTTP_BODY" | head -c 400)"
      skip "sellerId UUID check"
      skip "Negotiation thread check"
    fi
  fi
fi

# ── Summary ──────────────────────────────────────────────────────────────────
TOTAL=$((PASS + FAIL + SKIP))
echo ""
echo "════════════════════════════════════"
echo -e "${BOLD}Results: $TOTAL checks${NC}"
echo -e "  ${GREEN}✓ Passed${NC}  : $PASS"
echo -e "  ${RED}✗ Failed${NC}  : $FAIL"
echo -e "  ${YELLOW}– Skipped${NC} : $SKIP"
echo "════════════════════════════════════"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}${BOLD}DEPLOY NOT HEALTHY — $FAIL check(s) failed.${NC}"
  exit 1
else
  echo -e "${GREEN}${BOLD}Deploy looks healthy. Proceed to full QA smoke test.${NC}"
  exit 0
fi
