#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TS_UTC="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"
RUN_DATE_UTC="$(date -u +"%Y-%m-%d")"

QA_HEARTBEAT_DIR="$PROJECT_ROOT/reports/qa-buyer/heartbeats"
QA_EVIDENCE_DIR="$PROJECT_ROOT/reports/qa-buyer/evidence/$TS_UTC"
PM_INBOX_DIR="$PROJECT_ROOT/reports/product-manager/inbox"
API_DOCS_FILE="$PROJECT_ROOT/src/app/api-docs/page.tsx"
REPORT_FILE="$QA_HEARTBEAT_DIR/$TS_UTC-buyer-heartbeat.md"
PM_REPORT_FILE="$PM_INBOX_DIR/$TS_UTC-qa-buyer-findings.md"
FINDINGS_FILE="$QA_EVIDENCE_DIR/findings.tsv"

mkdir -p "$QA_HEARTBEAT_DIR" "$QA_EVIDENCE_DIR" "$PM_INBOX_DIR"
: > "$FINDINGS_FILE"

add_finding() {
  local severity="$1"
  local journey="$2"
  local title="$3"
  local endpoint="$4"
  local expected="$5"
  local actual="$6"
  local repro="$7"
  local evidence="$8"
  printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
    "$severity" "$journey" "$title" "$endpoint" "$expected" "$actual" "$repro" "$evidence" \
    >> "$FINDINGS_FILE"
}

check_route_exists() {
  local journey="$1"
  local endpoint="$2"
  local route_file="$3"
  local severity="$4"
  local title="$5"

  if [[ ! -f "$PROJECT_ROOT/$route_file" ]]; then
    add_finding \
      "$severity" \
      "$journey" \
      "$title" \
      "$endpoint" \
      "Route file exists: $route_file" \
      "Missing route file: $route_file" \
      "test -f '$PROJECT_ROOT/$route_file'" \
      "Filesystem check failed"
  fi
}

# Static route checks from API docs buyer journey
check_route_exists "search" "GET /api/agent/listings/search" "src/app/api/agent/listings/search/route.ts" "low" "Search route missing"
check_route_exists "negotiation" "POST /api/agent/listings/:id/bids" "src/app/api/agent/listings/[id]/bids/route.ts" "critical" "Cannot place bids"
check_route_exists "negotiation" "POST /api/agent/bids/:id/counter" "src/app/api/agent/bids/[id]/counter/route.ts" "critical" "Cannot send counter offers"
check_route_exists "negotiation" "POST /api/agent/bids/:id/accept" "src/app/api/agent/bids/[id]/accept/route.ts" "critical" "Cannot accept bid offers"
check_route_exists "messaging" "POST /api/agent/listings/:id/messages" "src/app/api/agent/listings/[id]/messages/route.ts" "high" "Cannot message seller from listing"
check_route_exists "pickup" "POST /api/agent/orders/:id/pickup" "src/app/api/agent/orders/[id]/pickup/route.ts" "low" "Pickup route missing"

PORT=3000
DEV_LOG="$QA_EVIDENCE_DIR/dev.log"
REQ_LOG="$QA_EVIDENCE_DIR/http-checks.log"
: > "$REQ_LOG"

DEV_PID=""
cleanup() {
  if [[ -n "$DEV_PID" ]] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill "$DEV_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# Start local dev server for live probes
npm run dev >"$DEV_LOG" 2>&1 &
DEV_PID=$!

ready=0
for _ in {1..40}; do
  if curl -s -o /dev/null "http://localhost:$PORT"; then
    ready=1
    break
  fi
  sleep 0.5
done

if [[ "$ready" -ne 1 ]]; then
  add_finding \
    "high" \
    "heartbeat" \
    "Live checks could not start" \
    "local dev server" \
    "Server responds on localhost:$PORT" \
    "No response within 20s" \
    "npm run dev; curl http://localhost:$PORT" \
    "$DEV_LOG"
else
  run_http_check() {
    local journey="$1"
    local name="$2"
    local endpoint="$3"
    local method="$4"
    local data="$5"

    local safe_name
    safe_name="$(echo "$name" | tr ' ' '_' | tr -cd '[:alnum:]_-')"

    local hdr="$QA_EVIDENCE_DIR/${safe_name}.headers.txt"
    local body="$QA_EVIDENCE_DIR/${safe_name}.body.txt"

    local code
    if [[ -n "$data" ]]; then
      code="$(curl -sS -X "$method" "http://localhost:$PORT$endpoint" -H 'Content-Type: application/json' -D "$hdr" -o "$body" --data "$data" -w '%{http_code}')"
    else
      code="$(curl -sS -X "$method" "http://localhost:$PORT$endpoint" -D "$hdr" -o "$body" -w '%{http_code}')"
    fi

    {
      echo "[$name] $method $endpoint"
      echo "status=$code"
      echo "headers_file=$hdr"
      echo "body_file=$body"
      echo
    } >> "$REQ_LOG"

    case "$name" in
      "search_without_auth")
        if [[ "$code" != "401" ]]; then
          add_finding "medium" "$journey" "Search auth guard regressed" "$method $endpoint" "HTTP 401 without Authorization header" "HTTP $code" "curl -i -X $method http://localhost:$PORT$endpoint" "$hdr;$body"
        fi
        ;;
      "pickup_without_auth")
        if [[ "$code" != "401" ]]; then
          add_finding "medium" "$journey" "Pickup auth guard regressed" "$method $endpoint" "HTTP 401 without Authorization header" "HTTP $code" "curl -i -X $method http://localhost:$PORT$endpoint -H 'Content-Type: application/json' --data '$data'" "$hdr;$body"
        fi
        ;;
      "bid_route_probe")
        if [[ "$code" == "404" ]]; then
          add_finding "critical" "$journey" "Negotiation bid endpoint returns 404" "$method $endpoint" "Endpoint exists and returns API error/auth response" "HTTP 404 Not Found" "curl -i -X $method http://localhost:$PORT$endpoint -H 'Content-Type: application/json' --data '$data'" "$hdr;$body;$DEV_LOG"
        fi
        ;;
      "counter_route_probe")
        if [[ "$code" == "404" ]]; then
          add_finding "critical" "$journey" "Negotiation counter endpoint returns 404" "$method $endpoint" "Endpoint exists and returns API error/auth response" "HTTP 404 Not Found" "curl -i -X $method http://localhost:$PORT$endpoint -H 'Content-Type: application/json' --data '$data'" "$hdr;$body;$DEV_LOG"
        fi
        ;;
      "accept_route_probe")
        if [[ "$code" == "404" ]]; then
          add_finding "critical" "$journey" "Negotiation accept endpoint returns 404" "$method $endpoint" "Endpoint exists and returns API error/auth response" "HTTP 404 Not Found" "curl -i -X $method http://localhost:$PORT$endpoint" "$hdr;$body;$DEV_LOG"
        fi
        ;;
    esac
  }

  run_http_check "search" "search_without_auth" "/api/agent/listings/search?q=qa-heartbeat" "GET" ""
  run_http_check "pickup" "pickup_without_auth" "/api/agent/orders/order_qa_probe/pickup" "POST" '{"pickupLocation":"123 QA Street"}'
  run_http_check "negotiation" "bid_route_probe" "/api/agent/listings/listing_qa_probe/bids" "POST" '{"amount":12000,"message":"QA probe","expiresIn":86400}'
  run_http_check "negotiation" "counter_route_probe" "/api/agent/bids/bid_qa_probe/counter" "POST" '{"amount":12500,"message":"counter QA probe"}'
  run_http_check "negotiation" "accept_route_probe" "/api/agent/bids/bid_qa_probe/accept" "POST" ''
fi

{
  echo "# QA Buyer Heartbeat Report"
  echo
  echo "- Run timestamp (UTC): $TS_UTC"
  echo "- Run date (UTC): $RUN_DATE_UTC"
  echo "- Scope: search, negotiation, pickup, messaging"
  echo "- API docs source: $API_DOCS_FILE"
  echo "- Evidence directory: $QA_EVIDENCE_DIR"
  echo
  echo "## Findings"
  echo

  if [[ ! -s "$FINDINGS_FILE" ]]; then
    echo "No issues found in this heartbeat run."
  else
    i=0
    while IFS=$'\t' read -r severity journey title endpoint expected actual repro evidence; do
      i=$((i + 1))
      echo "### $i. [$severity] $title"
      echo "- Journey: $journey"
      echo "- Endpoint: $endpoint"
      echo "- Expected: $expected"
      echo "- Actual: $actual"
      echo "- Repro: \`$repro\`"
      echo "- Evidence: $evidence"
      echo
    done < "$FINDINGS_FILE"
  fi

  echo "## Routing"
  echo
  echo "Routed to Product Manager inbox: $PM_REPORT_FILE"
} > "$REPORT_FILE"

cp "$REPORT_FILE" "$PM_REPORT_FILE"

echo "Heartbeat complete"
echo "Report: $REPORT_FILE"
echo "PM route: $PM_REPORT_FILE"
echo "Evidence: $QA_EVIDENCE_DIR"
