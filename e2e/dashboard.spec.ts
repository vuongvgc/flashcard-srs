import { expect, test } from "@playwright/test";

test.describe("Dashboard", () => {
	test("shows streak card", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page.locator("text=day streak")).toBeVisible();
	});

	test("shows due card count", async ({ page }) => {
		await page.goto("/dashboard");
		await expect(page.locator("text=cards due today")).toBeVisible();
	});

	test("bottom nav navigates to decks", async ({ page }) => {
		await page.goto("/dashboard");
		await page.click('a[href="/decks"]');
		await expect(page).toHaveURL(/\/decks/);
	});

	test("bottom nav navigates to settings", async ({ page }) => {
		await page.goto("/dashboard");
		await page.click('a[href="/settings"]');
		await expect(page).toHaveURL(/\/settings/);
	});
});
