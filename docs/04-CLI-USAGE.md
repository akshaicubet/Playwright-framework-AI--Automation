# CLI Usage, Parallelism & CI/CD

## Everyday commands

```bash
npm test                 # everything, all projects, parallel
npm run test:ui          # tests/ui only
npm run test:api         # tests/api only (browser-less)
npm run test:headed      # see the browser
npm run test:debug       # Playwright inspector, step through
npm run test:chromium    # single browser project
npm run test:firefox
npm run test:webkit
npm run report           # open last HTML report
npm run codegen          # Playwright's own recorder, for quick manual scripting
```

Direct CLI (bypassing npm scripts) works the same as any Playwright project:

```bash
npx playwright test tests/ui/checkout.spec.ts
npx playwright test -g "user can log in"     # filter by test title
npx playwright test --project=firefox --headed
```

## Parallelism

Two independent axes of parallelism are configured out of the box:

1. **Workers** (`playwright.config.ts` → `workers`): multiple test *files*
   run concurrently on one machine. `fullyParallel: true` also parallelizes
   tests *within* a file. Locally this defaults to 50% of CPU cores;
   override with `npm run test:parallel` (`--workers=4`) or
   `PWTEST_WORKERS`.
2. **Projects** (browsers): `chromium`, `firefox`, `webkit`, `mobile-chrome`,
   and `api` are separate projects and run independently — `npm test` runs
   all of them, `--project=chromium` restricts to one.

## Sharding (for CI)

Sharding splits the *same* project's tests across multiple CI machines/jobs:

```bash
npx playwright test --shard=1/2
npx playwright test --shard=2/2
```

The bundled CI workflow (`.github/workflows/playwright.yml`) shards each
browser project 2 ways, so `chromium × 2 shards`, `firefox × 2 shards`,
`webkit × 2 shards` = 6 parallel jobs, plus a separate API job — adjust the
`matrix.shard` array to scale up/down.

## Reports & artifacts

Configured in `playwright.config.ts`:

| Artifact | Setting | Where |
|---|---|---|
| HTML report | `reporter: ['html', ...]` | `playwright-report/` |
| JUnit XML (CI integrations) | `reporter: ['junit', ...]` | `reports/junit-results.xml` |
| JSON (for tooling/dashboards) | `reporter: ['json', ...]` | `reports/test-results.json` |
| Screenshots | `screenshot: 'only-on-failure'` | `test-results/<test>/` |
| Video | `video: 'retain-on-failure'` | `test-results/<test>/` |
| Trace (timeline, DOM snapshots, network) | `trace: 'retain-on-failure'` | `test-results/<test>/trace.zip` — open with `npx playwright show-trace <path>` |

All of these are gitignored by default (see `.gitignore`) — they're runtime
output, not source.

## CI/CD notes

The included pipeline is GitHub Actions
(`.github/workflows/playwright.yml`). It:

- Runs on push/PR to `main`/`develop`, plus manual dispatch with an
  environment picker.
- Matrix-runs UI tests across 3 browsers × 2 shards in parallel
  (`fail-fast: false` so one browser's failure doesn't cancel the others).
- Runs API tests as a separate, faster job (no browser install needed).
- Uploads the HTML report and, on failure, the full `test-results/`
  directory (traces/videos/screenshots) as build artifacts.
- Uploads `healed-locators.json` every run so you can see if self-healing
  fired in CI, even on a green build.
- Reads secrets (`BASE_URL`, credentials, `ANTHROPIC_API_KEY` for Tier-2
  healing) from GitHub Actions secrets — configure these in your repo under
  Settings → Secrets and variables → Actions.

### Porting to other CI systems

The underlying commands are plain `npx playwright test ...` calls, so this
maps directly onto GitLab CI, CircleCI, Jenkins, or Azure Pipelines:

```yaml
# GitLab CI sketch
test:
  image: mcr.microsoft.com/playwright:v1.48.0-jammy
  parallel:
    matrix:
      - SHARD: ["1/2", "2/2"]
  script:
    - npm ci
    - npx playwright test --shard=$SHARD --reporter=html,junit
  artifacts:
    when: always
    paths: [playwright-report/, test-results/]
```

Key requirement for any CI system: use the official Playwright Docker image
(or run `npx playwright install --with-deps`) so browser binaries and OS
dependencies are present.

## Environment selection

`playwright.config.ts` loads `.env.${ENV}` (falls back to `.env`), so you can
keep separate credential sets:

```bash
cp .env.example .env.local
cp .env.example .env.staging
ENV=staging npm test
```

Never commit `.env*` files except `.env.example` — enforced by
`.gitignore`.
