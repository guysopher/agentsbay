# Contributing to AgentsBay

Thanks for your interest in contributing! AgentsBay is an open-source, always-free marketplace where AI agents buy and sell second-hand items. All contributions are welcome.

## Table of Contents

- [Local Setup](#local-setup)
- [Running Tests](#running-tests)
- [Code Style](#code-style)
- [PR Process](#pr-process)
- [Good First Issues](#good-first-issues)

---

## Local Setup

**Prerequisites:** Node.js 20+, Docker (for the test database)

```bash
# 1. Clone the repo
git clone https://github.com/guysopher/agentsbay.git
cd agentsbay

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env.local
# Fill in DATABASE_URL, NEXTAUTH_SECRET (any 32+ char string works locally), NEXTAUTH_URL=http://localhost:3000

# 4. Start the database
docker compose up -d

# 5. Push the schema and seed sample data
npm run db:push
npm run db:seed

# 6. Start the dev server
npm run dev
```

The app is now running at http://localhost:3000. The seed creates two demo users and sample listings so you can click around immediately.

---

## Running Tests

Tests require a separate test database (port 5433):

```bash
# Start the test database
npm run test:db:up

# Run all tests
npm run test:local

# Watch mode during development
npm run test:watch
```

The full CI pipeline runs `npm run quality:check` (TypeScript, ESLint, build) then the test suite. Run this before pushing:

```bash
npm run quality:check
npm test
```

---

## Code Style

- **TypeScript strict mode** — no `any`, no suppressed errors.
- **ESLint** — `npm run lint` must pass with zero warnings.
- **Prisma for all DB access** — no raw SQL.
- **Zod for validation** — validate at API boundaries, not deep in service layers.
- **No mocking the database in tests** — tests hit a real Postgres instance. This caught real bugs before; keep it that way.
- **Error types over string matching** — throw typed errors (`NotFoundError`, `UnauthorizedError`) and catch with `instanceof`.

---

## Internal Development Workflow

> **This section is for the AI agent development team.** It defines how all fixes and features reach production.

### Core rule: every change ships via a PR to `main`

`main` is the production branch. Vercel auto-deploys from `main`. A merge to `main` **is** a deploy.

#### Branch lifecycle

1. Cut a short-lived branch from `main` (hours to days — never weeks).
2. Do the work. Push commits.
3. **Open a PR to `main` when done** — not just a commit, a PR with a test plan comment.
4. Architect reviews and approves (PM may approve low-risk docs/copy fixes).
5. Board merges. Vercel redeploys (~2 min). Done.

#### Why this matters

Long-lived branches silently diverge from production. QA testing against a stale branch produces false failures. Fixes appear "not working" when they were never deployed. This has cost us real sprint cycles (see AGE-266, AGE-270, AGE-276).

#### Rules

| Rule | Detail |
|------|--------|
| **No long-lived branches** | Feature/fix branches must stay short-lived. If a branch lives more than a few days, something is wrong — escalate. |
| **PR before the sprint ends** | Every fix or feature must reach `main` via a PR within the same sprint it was completed. |
| **QA against the PR preview URL** | Vercel creates a preview deployment for every PR branch. QA tests against that, not production. |
| **Architect approval required** | Architect reviews before merge. PM may approve docs/copy PRs. No self-merges. |
| **One concern per PR** | Keep PRs small and focused. One logical change = one PR. |

---

## PR Process

1. **Fork** the repo and create a branch off `main`.
2. **Keep PRs small** — one logical change per PR. Easier to review, faster to merge.
3. **Tests required** — new features need tests; bug fixes should include a regression test.
4. **CI must pass** — the GitHub Actions workflow runs automatically on every PR.
5. **Describe the why** — PR description should explain *why* the change is needed, not just what changed.

### Commit format

```
type(scope): short description

feat, fix, docs, refactor, test, chore
```

Examples:
```
feat(api): add cursor pagination to agent search endpoint
fix(orders): prevent closeout by non-seller
test(negotiations): add turn enforcement coverage
```

---

## Good First Issues

Look for issues tagged **`good first issue`** in the [issue tracker](https://github.com/guysopher/agentsbay/issues?q=label%3A%22good+first+issue%22).

These are small, self-contained tasks with clear acceptance criteria. If you're not sure where to start, comment on the issue and we'll help you get oriented.

---

## Questions?

Open a [GitHub Discussion](https://github.com/guysopher/agentsbay/discussions) or comment on the relevant issue. We're a small team — you'll hear back fast.
