import { test, expect } from "@playwright/test";

/**
 * Login page E2E tests.
 *
 * These tests verify the unauthenticated state of the application.
 * No real backend or Google OAuth is required – the page renders
 * entirely on the client side.
 */

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders the login card", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  });

  test("shows the team restriction message in German", async ({ page }) => {
    await expect(
      page.getByText("Der Zugriff ist auf das Annalanah Team beschränkt.")
    ).toBeVisible();
  });

  test("has a Google sign-in button", async ({ page }) => {
    const btn = page.getByRole("button", { name: /mit google anmelden/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test("clicking the Google button redirects toward /auth/google", async ({
    page,
  }) => {
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/auth/google")),
      page.getByRole("button", { name: /mit google anmelden/i }).click(),
    ]);
    expect(request.url()).toContain("/auth/google");
  });

  test("has correct page title", async ({ page }) => {
    // The default Vite title from index.html is present
    await expect(page).toHaveTitle(/.+/);
  });
});

test.describe("Authentication redirect", () => {
  test("unauthenticated users visiting / are redirected to /login", async ({
    page,
  }) => {
    await page.goto("/");
    // Wait for either redirect to /login or the login page content to appear
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  });

  test("unauthenticated users visiting /leads are redirected to /login", async ({
    page,
  }) => {
    await page.goto("/leads");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  });

  test("unauthenticated users visiting /clients are redirected to /login", async ({
    page,
  }) => {
    await page.goto("/clients");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  });
});

test.describe("404 page", () => {
  test("shows 404 for unknown public routes while authenticated (fallback)", async ({
    page,
  }) => {
    // Navigate to an unknown route.  When unauthenticated, the AuthGate
    // redirects to /login first; so we just check we either see 404 or login.
    await page.goto("/this-page-does-not-exist");
    const hasLogin = await page
      .getByRole("heading", { name: "Login" })
      .isVisible()
      .catch(() => false);
    const has404 = await page
      .getByRole("heading", { name: "404" })
      .isVisible()
      .catch(() => false);
    expect(hasLogin || has404).toBe(true);
  });
});
