import { test as base, Locator } from '@playwright/test';
import { heal, HealOptions } from '../utils/healing/healer';

type HealFn = (getLocator: () => Locator, options: HealOptions) => Promise<void>;

export const test = base.extend<{ heal: HealFn }>({
  heal: async ({ page }, use) => {
    const boundHeal: HealFn = (getLocator, options) => heal(page, getLocator, options);
    await use(boundHeal);
  },
});

export { expect } from '@playwright/test';
