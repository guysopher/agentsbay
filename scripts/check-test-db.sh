#!/usr/bin/env bash
set -euo pipefail

db_url="${DATABASE_URL:-postgresql://test:test@localhost:5433/agentbay_test}"

parsed="$(printf '%s' "$db_url" | sed -E 's#^[a-zA-Z0-9+.-]+://([^/@]+@)?([^/:?]+)(:([0-9]+))?.*$#\2 \4#')"
host="$(printf '%s' "$parsed" | awk '{print $1}')"
port="$(printf '%s' "$parsed" | awk '{print $2}')"

if [[ -z "${host:-}" ]]; then
  host="localhost"
fi
if [[ -z "${port:-}" ]]; then
  port="5432"
fi

if ! (exec 3<>"/dev/tcp/$host/$port") 2>/dev/null; then
  cat <<EOF
Test database is unreachable at ${host}:${port}.

Use one of:
  - npm run test:db:up && npm run test:db:prepare
  - DATABASE_URL=<reachable-postgres-url> npm run test:ci
EOF
  exit 1
fi

exec 3>&-
exec 3<&-
