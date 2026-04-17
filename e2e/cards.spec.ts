import { expect, test } from "@playwright/test";
import { unique } from "./helpers";

test.describe("Cards", () => {
	let deckUrl: string;
	const deckName = unique("CardDeck");

	test.beforeAll(async ({ browser }) => {
		const ctx = await browser.newContext({
			storageState: "e2e/.auth/user.json",
		});
		const page = await ctx.newPage();

		// Create a deck for card tests
		await page.goto("/decks");
		await page.click("text=New Deck");
		await page.fill('input[name="name"]', deckName);
		await page.click('button:has-text("Create")');
		await expect(page.locator(`text=${deckName}`)).toBeVisible({
			timeout: 5000,
		});

		// Navigate into deck
		await page.click(`text=${deckName}`);
		await page.waitForURL(/\/decks\/.+/);
		deckUrl = page.url();

		await ctx.close();
	});

	test("add a card", async ({ page }) => {
		await page.goto(deckUrl);
		await page.click("text=Add");
		await page.fill('input[name="front"]', "apple");
		await page.fill('input[name="back"]', "táo");
		await page.click('button:has-text("Add Card")');

		await expect(page.locator("text=apple")).toBeVisible({ timeout: 5000 });
		await expect(page.locator("text=táo")).toBeVisible();
	});

	test("delete a card", async ({ page }) => {
		await page.goto(deckUrl);

		// Add a card to delete
		await page.click("text=Add");
		await page.fill('input[name="front"]', "deletethis");
		await page.fill('input[name="back"]', "xóa cái này");
		await page.click('button:has-text("Add Card")');
		await expect(page.locator("text=deletethis")).toBeVisible({
			timeout: 5000,
		});

		// Handle confirm dialog
		page.on("dialog", (dialog) => dialog.accept());

		// Find the delete button (Trash2 icon button) near "deletethis"
		const cardRow = page.locator("text=deletethis").locator("../..");
		await cardRow.getByRole("button").click();

		await expect(page.locator("text=deletethis")).not.toBeVisible({
			timeout: 5000,
		});
	});

	test("navigate into deck from deck list", async ({ page }) => {
		await page.goto("/decks");
		await page.click(`text=${deckName}`);
		await expect(page).toHaveURL(/\/decks\/.+/);
		await expect(
			page.locator("h1").filter({ hasText: deckName }),
		).toBeVisible();
	});
});
