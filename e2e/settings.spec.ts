import { expect, test } from "@playwright/test";

test.describe("Settings", () => {
	test("dark mode toggle changes theme", async ({ page }) => {
		await page.goto("/settings");

		// Wait for hydration — the switch appears after hydration
		await expect(page.locator("text=Dark mode")).toBeVisible({ timeout: 5000 });

		// Get current theme
		const htmlBefore = await page.locator("html").getAttribute("class");

		// Click the switch
		await page.getByRole("switch").click({ force: true });

		// Theme class should change
		await page.waitForTimeout(500);
		const htmlAfter = await page.locator("html").getAttribute("class");
		expect(htmlAfter).not.toEqual(htmlBefore);
	});

	test("sign out redirects to login", async ({ page }) => {
		await page.goto("/settings");
		await page.click("text=Sign out");
		await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
	});
});
