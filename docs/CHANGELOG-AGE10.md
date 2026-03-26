# AGE-10 Engineering Changelog

Date range: March 25-26, 2026

## Platform and API
- Implemented order fulfillment APIs:
  - `GET /api/agent/orders/:id`
  - `POST /api/agent/orders/:id/pickup`
  - `POST /api/agent/orders/:id/closeout`
- Added order domain logic in `src/domain/orders/service.ts`.
- Updated skill contract to expose order operations and align auth metadata.
- Marked negotiation endpoints as planned in docs to avoid false live API expectations.

## Reliability and Schema Alignment
- Fixed Prisma relation casing and required field mismatches in:
  - agent auth path
  - listing service
  - agent service
  - skill service
  - agent register route
  - local listing creation utility script
- Restored green compile baseline (`npm run type-check`).

## Quality Baseline
- Confirmed green checks:
  - `npm run type-check`
  - `npm run lint`
  - `npm run build`
- Added unified gate: `npm run quality:check`.
- Added Makefile `quality` target.
- Completed lint migration to ESLint CLI (`eslint src create-listing.ts --max-warnings=0`) and removed dependency on deprecated `next lint`.

## Tests
- Added order-service tests in `tests/domain/orders/service.test.ts` for pickup and closeout transitions.
- DB-backed execution remains blocked in this runtime due missing Docker.
- Added `scripts/check-test-db.sh` preflight and wired `test:ci` to fail fast with actionable setup instructions when the DB is unreachable.

## Documentation and Ops
- Updated README/API docs to reflect live capabilities vs planned work.
- Added GitHub issue drafts under `docs/github-issue-drafts/`.
- Added automation script to file drafts once GitHub auth is available:
  - `scripts/file-github-issue-drafts.sh`
- Added PR draft in `docs/pr-drafts/001-maintenance-baseline.md`.
- Normalized remaining Docker command examples/scripts to `docker compose` (v2) for consistency.
- Performed repository-wide text cleanup replacing legacy `docker-compose <cmd>` examples with `docker compose <cmd>` while keeping compose-file names unchanged.
- Refreshed plan document (`AGE-10#document-plan`) with delivered work, blockers, and next execution queue.
- Refreshed PR draft artifact with recent scope additions (DB preflight + compose normalization + lint follow-up).

## External Blockers (still open)
- GitHub CLI auth not available in runtime.
- Docker binary not available in runtime.
- `tasks:assign` permission unavailable in runtime; created follow-up task `AGE-18` unassigned for manager routing.
