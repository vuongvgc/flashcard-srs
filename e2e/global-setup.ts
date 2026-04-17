import { expect, test as setup } from "@playwright/test";

const TEST_EMAIL = "playwright-test@e2e.local";
const TEST_PASSWORD = "test123456";

setup("create test user and authenticate", async ({ page }) => {
	// Register test user via API (ignore 409 if already exists)
	const res = await page.request.post("/api/auth/register", {
		data: { email: TEST_EMAIL, password: TEST_PASSWORD },
	});
	expect([201, 409]).toContain(res.status());

	// Login via UI to get session cookie
	await page.goto("/login");
	await page.fill('input[name="email"]', TEST_EMAIL);
	await page.fill('input[name="password"]', TEST_PASSWORD);
	await page.click('button[type="submit"]');
	await page.waitForURL("/dashboard", { timeout: 10000 });

	// Save auth state
	await page.context().storageState({ path: "e2e/.auth/user.json" });
});
