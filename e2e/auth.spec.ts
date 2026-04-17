import { expect, test } from "@playwright/test";

test.describe("Auth", () => {
	test.use({ storageState: { cookies: [], origins: [] } }); // No auth

	test("redirect to login when not authenticated", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page).toHaveURL(/\/login/);
	});

	test("register a new account", async ({ page }) => {
		const email = `test-${Date.now()}@e2e.local`;
		await page.goto("/register");
		await page.fill('input[name="email"]', email);
		await page.fill('input[name="password"]', "test123456");
		await page.fill('input[name="confirm"]', "test123456");
		await page.click('button[type="submit"]');
		// Register page redirects to dashboard after success
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
	});

	test("login with valid credentials", async ({ page }) => {
		await page.goto("/login");
		await page.fill('input[name="email"]', "playwright-test@e2e.local");
		await page.fill('input[name="password"]', "test123456");
		await page.click('button[type="submit"]');
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
	});

	test("login with wrong password shows error", async ({ page }) => {
		await page.goto("/login");
		await page.fill('input[name="email"]', "playwright-test@e2e.local");
		await page.fill('input[name="password"]', "wrongpassword");
		await page.click('button[type="submit"]');
		await expect(page.locator(".text-destructive")).toBeVisible({
			timeout: 5000,
		});
	});
});
