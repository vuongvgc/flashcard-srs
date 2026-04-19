import { expect, test } from "@playwright/test";
import path from "path";
import { unique } from "./helpers";

test.describe("Decks", () => {
	test("create a new deck", async ({ page }) => {
		const name = unique("Deck");
		await page.goto("/decks");
		await page.click("text=New Deck");
		await page.fill('input[name="name"]', name);
		await page.click('button:has-text("Create")');
		await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5000 });
	});

	test("delete a deck", async ({ page }) => {
		const name = unique("DeleteMe");
		await page.goto("/decks");

		// Create first
		await page.click("text=New Deck");
		await page.fill('input[name="name"]', name);
		await page.click('button:has-text("Create")');
		await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5000 });

		// Open kebab menu on the deck
		const deckLink = page.locator(`a:has-text("${name}")`);
		await deckLink.locator("button").last().click({ force: true });

		// Handle confirm dialog
		page.on("dialog", (dialog) => dialog.accept());

		// Click Delete in dropdown menu
		await page.getByRole("menuitem", { name: "Delete" }).click();

		await expect(page.locator(`text=${name}`)).not.toBeVisible({
			timeout: 5000,
		});
	});

	test("import CSV creates cards", async ({ page }) => {
		const name = unique("CSVDeck");
		await page.goto("/decks");

		// Create deck
		await page.click("text=New Deck");
		await page.fill('input[name="name"]', name);
		await page.click('button:has-text("Create")');
		await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5000 });

		// Open kebab menu and import
		const deckLink = page.locator(`a:has-text("${name}")`);
		await deckLink.locator("button").last().click({ force: true });
		await page.getByRole("menuitem", { name: "Import CSV" }).click();

		const csvPath = path.resolve(__dirname, "fixtures/sample.csv");
		await page.setInputFiles('input[type="file"]', csvPath);
		await page.click('button:has-text("Import")');

		// Wait for import to complete, then check card count
		await expect(page.locator(`text=3 cards`).first()).toBeVisible({
			timeout: 10000,
		});
	});

	test("toggle review enabled/disabled", async ({ page }) => {
		const name = unique("ToggleDeck");
		await page.goto("/decks");

		// Create deck
		await page.click("text=New Deck");
		await page.fill('input[name="name"]', name);
		await page.click('button:has-text("Create")');
		await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5000 });

		// Find the kebab button near our deck name
		const deckLink = page.locator(`a:has-text("${name}")`);
		await deckLink.locator("button").last().click({ force: true });
		await page.getByRole("menuitem", { name: "Pause Review" }).click();

		// Wait for page refresh and verify "Paused" badge appears
		await expect(deckLink.locator("text=Paused")).toBeVisible({
			timeout: 5000,
		});

		// Re-enable
		await deckLink.locator("button").last().click({ force: true });
		await page.getByRole("menuitem", { name: "Enable Review" }).click();

		// Wait for "Paused" to disappear from this specific deck
		await expect(deckLink.locator("text=Paused")).not.toBeVisible({
			timeout: 5000,
		});
	});
});
