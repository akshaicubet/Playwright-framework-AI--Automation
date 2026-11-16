import { test, expect } from '../../fixtures/healing-fixture';

/**
 * TEMPLATE TEST — generated the way Claude (via MCP exploration) should
 * generate specs: semantic, user-facing locators only. No XPaths, no
 * auto-generated nth-child CSS. Wrap risky actions in `heal()` so that a
 * broken locator self-repairs at runtime instead of failing the whole run.
 */
test.describe('Login flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('user can log in with valid credentials', async ({ page, heal }) => {
    // Preferred: direct semantic locators when you're confident they're stable.
    await page.getByLabel('Email Address').fill(process.env.TEST_USER_EMAIL || 'qa.tester@example.com');
    await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD || 'change_me');

    // Wrapped in heal(): if this button's locator ever breaks (rename, restructure),
    // Tier-1/Tier-2 healing kicks in automatically instead of failing the test.
    await heal(() => page.getByRole('button', { name: 'Sign In' }), {
      descriptor: 'Sign In button',
      actionType: 'click',
    });

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('shows validation error for invalid credentials', async ({ page }) => {
    await page.getByLabel('Email Address').fill('invalid@example.com');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByRole('alert')).toContainText(/invalid credentials/i);
  });

  test('checkout button uses data-testid as a stable fallback', async ({ page, heal }) => {
    // Use data-testid when there is no reliable accessible role/name.
    await heal(() => page.getByTestId('checkout-btn'), {
      descriptor: 'Checkout button',
      actionType: 'click',
    });
    await expect(page.getByRole('heading', { name: 'Order Summary' })).toBeVisible();
  });
});
