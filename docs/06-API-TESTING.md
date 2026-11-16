# API Testing

API tests use Playwright's built-in `request` fixture — no browser is
launched, so this project runs fast and cheap, and parallelizes trivially.

## Config

`playwright.config.ts` defines a dedicated project:

```ts
{
  name: 'api',
  testDir: './tests/api',
  use: { baseURL: API_BASE_URL },
}
```

Run just this project:

```bash
npm run test:api
# or
npx playwright test --project=api
```

## The client wrapper

`utils/api-client.ts` wraps Playwright's `APIRequestContext` with automatic
auth headers pulled from env vars (`API_KEY`, `API_BEARER_TOKEN`):

```ts
import { ApiClient } from '../../utils/api-client';

test('example', async ({ request }) => {
  const client = new ApiClient(request);
  const res = await client.get('/users', { page: 1 });
  expect(res.status()).toBe(200);
});
```

Extend `ApiClient` per-service if you need custom headers (e.g., an
`X-Tenant-Id` header for a multi-tenant API) — pass them via the
`baseHeaders` constructor argument or per-call `extraHeaders`.

## Template test

See `tests/api/example-users.api.spec.ts` for CRUD coverage patterns:
list/pagination, create, not-found, partial update, delete. Copy this file
as a starting point for a new resource.

## Combining API + UI in one flow

For hybrid tests (e.g., seed data via API, then verify in UI), just import
both fixtures in a `tests/ui/*.spec.ts` file — `request` is available
alongside `page` in the default Playwright test fixture, and the healing
fixture (`fixtures/healing-fixture.ts`) extends the same base, so you get
`page`, `request`, and `heal` all together:

```ts
import { test, expect } from '../../fixtures/healing-fixture';
import { ApiClient } from '../../utils/api-client';

test('seed via API then verify in UI', async ({ page, request, heal }) => {
  const api = new ApiClient(request);
  const user = await (await api.post('/users', { name: 'Seed User', email: 'seed@example.com' })).json();

  await page.goto(`/users/${user.id}`);
  await expect(page.getByRole('heading', { name: 'Seed User' })).toBeVisible();
});
```

## Reporting

API test results feed into the same reporters as UI tests (`html`, `junit`,
`json`) — see `docs/04-CLI-USAGE.md`. The CI pipeline runs API tests as a
separate, faster job so a slow UI browser matrix doesn't block quick API
feedback.
