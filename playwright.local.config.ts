import { defineConfig, devices } from "@playwright/test";

/**
 * Standalone Playwright config for running E2E tests locally without the
 * lovable-agent-playwright-config package.
 *
 * Usage:
 *   npx playwright test --config=playwright.local.config.ts
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:5002",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5002",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
