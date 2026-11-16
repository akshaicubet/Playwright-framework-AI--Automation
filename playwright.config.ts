import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific .env file. Defaults to .env, override with ENV=staging etc.
dotenv.config({ path: path.resolve(__dirname, `.env.${process.env.ENV || 'local'}`) });
dotenv.config({ path: path.resolve(__dirname, '.env') }); // fallback / shared defaults

const BASE_URL = process.env.BASE_URL || 'https://example.com';
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.example.com';
const CI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',

  // ---- Execution behavior ----
  fullyParallel: true,                 // run test files in parallel
  forbidOnly: CI,                      // fail build if test.only left in CI
  retries: CI ? 2 : 0,                 // auto-retry flaky tests in CI
  workers: CI ? 4 : undefined,         // parallel workers; undefined = 50% of cores locally
  timeout: 30_000,
  expect: { timeout: 5_000 },

  // ---- Reporting: HTML + JUnit (CI) + list (console) + JSON (for healing/analytics) ----
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'reports/junit-results.xml' }],
    ['json', { outputFile: 'reports/test-results.json' }],
    ...(CI ? [['github'] as const] : []),
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',        // full trace viewer on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    ignoreHTTPSErrors: true,
  },

  // ---- Cross-browser matrix (parallelized as separate projects) ----
  projects: [
    { name: 'chromium', testDir: './tests/ui', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testDir: './tests/ui', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testDir: './tests/ui', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', testDir: './tests/ui', use: { ...devices['Pixel 7'] } },
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: API_BASE_URL },
    },
  ],

  // globalSetup: require.resolve('./utils/global-setup.ts'),
});
