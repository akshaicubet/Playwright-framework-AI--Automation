# Setup Checklist

Use this the first time you clone this template into a new project.

- [ ] `npm install`
- [ ] `npx playwright install --with-deps`
- [ ] `cp .env.example .env.local` and fill in `BASE_URL`, `API_BASE_URL`,
      test user credentials
- [ ] (optional, for Tier-2 self-healing) add `ANTHROPIC_API_KEY` to
      `.env.local`
- [ ] Update `playwright.config.ts` projects if you don't need all of
      chromium/firefox/webkit/mobile
- [ ] Replace `tests/ui/example-login.spec.ts` and
      `tests/api/example-users.api.spec.ts` with real flows (or generate new
      ones via `/explore`, see `docs/02-MCP-EXPLORATION.md`)
- [ ] Run `npm test` locally, confirm `playwright-report/` and
      `test-results/` are generated and gitignored correctly
- [ ] If using Claude Code: run `claude` once inside the repo to confirm
      `.mcp.json` picks up the Playwright MCP server (`/mcp` command lists
      connected servers)
- [ ] Set GitHub Actions secrets: `STAGING_BASE_URL`, `STAGING_API_BASE_URL`,
      `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `API_KEY`,
      `ANTHROPIC_API_KEY` (if using Tier-2 healing in CI)
- [ ] Push and confirm `.github/workflows/playwright.yml` runs green on the
      example tests before replacing them
- [ ] Delete the example tests once real coverage exists
- [ ] Read `QA-BIBLE.md` as a team once — it defines the process (roles,
      review gates, release sign-off) this tooling supports
- [ ] Drop your first real requirements doc into `requirements/` and run
      `/design-tests` to try the full pipeline end-to-end
