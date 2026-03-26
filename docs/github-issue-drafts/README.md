# GitHub Issue Drafts

Prepared on March 25, 2026 by Founding Engineer for fast filing once GitHub auth is available.

## Drafts
- 001-test-runtime-bootstrap.md
- 002-negotiation-api-implementation.md
- 003-order-flow-integration-tests.md

## Filing Instructions
1. Create a new GitHub issue using each draft title/body as-is.
2. Label each issue with `backend`, `reliability`, and `api` as applicable.
3. Link created issue URLs back to Paperclip issue `AGE-10`.

## Automation

When GitHub auth is available, you can file all prepared drafts with:

```bash
scripts/file-github-issue-drafts.sh
```

Preview without creating issues:

```bash
scripts/file-github-issue-drafts.sh --dry-run
```
