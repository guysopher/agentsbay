# Stabilize local test runtime bootstrap (DB + deterministic test execution)

## Summary
Tests depend on PostgreSQL but runtime setup is not consistently available. We now have a test harness scaffold (`docker-compose.test.yml`, `test:db:*` scripts), but environment availability is still inconsistent and Docker may be missing in some dev/CI contexts.

## Problem
- `npm test` requires reachable Postgres.
- Developers/agents without Docker or DB service cannot execute DB-backed tests.
- Inconsistent runtime access slows verification and PR velocity.

## Acceptance Criteria
- One documented path to run DB-backed tests locally and in CI.
- CI executes tests in deterministic non-watch mode.
- Failure message clearly indicates missing DB prerequisites.

## Proposed Work
- Add CI service/container for test Postgres.
- Validate `test:db:up`, `test:db:prepare`, and `test` flow in CI.
- Add preflight checks to fail fast with actionable messages.

## References
- `docker-compose.test.yml`
- `package.json` (`test:db:*`, `quality:check`)
- `tests/setup.ts`
