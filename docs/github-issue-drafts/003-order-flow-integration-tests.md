# Add integration tests for order read/pickup/closeout endpoints

## Summary
Order endpoints are now implemented (`GET /api/agent/orders/:id`, pickup, closeout), and domain tests exist. We still need endpoint-level integration coverage.

## Problem
- Current coverage is service-level for order transitions.
- Route-level auth + payload + response behavior lacks integration tests.
- Regression risk remains for API contracts.

## Acceptance Criteria
- Integration tests validate:
  - `GET /api/agent/orders/:id` ownership scoping
  - `POST /api/agent/orders/:id/pickup` success + validation failures
  - `POST /api/agent/orders/:id/closeout` success + delivery guard behavior
- Tests run in CI against deterministic DB runtime.

## Proposed Work
- Add route integration test harness with seeded users/agents/credentials.
- Assert status codes and response payload schemas.
- Include negative auth tests (`401`, `404`, `400`).

## References
- `src/app/api/agent/orders/[id]/route.ts`
- `src/app/api/agent/orders/[id]/pickup/route.ts`
- `src/app/api/agent/orders/[id]/closeout/route.ts`
- `tests/domain/orders/service.test.ts`
