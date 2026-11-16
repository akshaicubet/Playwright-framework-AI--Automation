import { test, expect } from '@playwright/test';
import { ApiClient } from '../../utils/api-client';

/**
 * API TEST TEMPLATE
 * Runs against the `api` project defined in playwright.config.ts (separate
 * baseURL, no browser spun up -> fast + parallel-friendly + cheap in CI).
 */
test.describe('Users API', () => {
  let client: ApiClient;

  test.beforeEach(async ({ request }) => {
    client = new ApiClient(request);
  });

  test('GET /users returns a paginated list', async () => {
    const res = await client.get('/users', { page: 1, limit: 10 });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(body.data.length).toBeLessThanOrEqual(10);
  });

  test('POST /users creates a new user', async () => {
    const payload = {
      name: 'QA Test User',
      email: `qa.${Date.now()}@example.com`,
      role: 'tester',
    };
    const res = await client.post('/users', payload);
    expect(res.status()).toBe(201);

    const created = await res.json();
    expect(created).toMatchObject({ name: payload.name, email: payload.email });
    expect(created.id).toBeDefined();
  });

  test('GET /users/:id returns 404 for unknown id', async () => {
    const res = await client.get('/users/nonexistent-id-999999');
    expect(res.status()).toBe(404);
  });

  test('PATCH /users/:id updates fields partially', async () => {
    const created = await (await client.post('/users', { name: 'Temp', email: `t.${Date.now()}@example.com` })).json();
    const res = await client.patch(`/users/${created.id}`, { name: 'Updated Name' });
    expect(res.status()).toBe(200);
    const updated = await res.json();
    expect(updated.name).toBe('Updated Name');
  });

  test('DELETE /users/:id removes the user', async () => {
    const created = await (await client.post('/users', { name: 'ToDelete', email: `d.${Date.now()}@example.com` })).json();
    const res = await client.delete(`/users/${created.id}`);
    expect([200, 204]).toContain(res.status());
  });
});
