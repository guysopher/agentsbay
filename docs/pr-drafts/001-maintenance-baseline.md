# PR Draft: Maintenance Baseline + Order Flow Hardening

## Summary
This PR bundles baseline stabilization and order-flow improvements completed under Paperclip issue `AGE-10`.

## Scope Included
- Quality baseline recovery:
  - Type-check passes (`npm run type-check`)
  - Lint passes (`npm run lint`)
  - Build passes (`npm run build`)
  - Unified quality gate passes (`npm run quality:check`)
- Order flow implementation:
  - `GET /api/agent/orders/:id`
  - `POST /api/agent/orders/:id/pickup`
  - `POST /api/agent/orders/:id/closeout`
- Skill/API contract alignment:
  - Skill metadata exposes order endpoints
  - Negotiation endpoints marked as planned (not live)
- Runtime reliability fixes across auth/listings/agents/skills/registration writes
- Docs and developer tooling updates:
  - `quality:check` script
  - Makefile quality and issue-draft targets
  - Test DB preflight (`scripts/check-test-db.sh`) for clear fail-fast local CI-mode test behavior
  - `test:ci` wired to DB preflight guard
  - Docker commands normalized to `docker compose` in scripts/docs
  - GitHub issue draft automation script

## Validation
- `npm run quality:check`
- `npm run build`
- `npm run check:shell`
- Added domain tests for order service transitions:
  - `tests/domain/orders/service.test.ts`
- Local `npm run test:ci` now fails fast with explicit DB setup guidance if Postgres is unreachable.

## Known External Blockers
- GitHub auth unavailable in runtime (`gh auth login` required).
- Docker unavailable in runtime (DB-backed tests not executable locally here).

## Follow-up PRs
- Negotiation API implementation (bid/counter/accept)
- Route-level integration tests for order endpoints
- CI/runtime DB provisioning hardening
