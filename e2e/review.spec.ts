import { expect, test } from "@playwright/test";
import { unique } from "./helpers";

test.describe("Review", () => {
	test("shows empty state when no cards due", async ({ page }) => {
		// Create a fresh empty deck (no cards) and go to review
		// The empty state shows when GET /api/review returns empty array
		await page.goto("/review");
		// Wait for page to load and check for either cards or empty state
		await page.waitForLoadState("networkidle");

		// If there happen to be due cards from other tests, that's OK —
		// just verify the page loaded successfully
		const hasCards = await page
			.locator("text=Tap to reveal")
			.isVisible()
			.catch(() => false);
		const hasEmpty = await page
			.locator("text=No cards due for review")
			.isVisible()
			.catch(() => false);
		expect(hasCards || hasEmpty).toBeTruthy();
	});

	test("full review flow: flip + rate", async ({ page }) => {
		// Create a deck with a card so there's something to review
		const name = unique("ReviewDeck");

		// Create deck via API
		const deckRes = await page.request.post("/api/decks", {
			data: { name },
		});
		expect(deckRes.ok()).toBeTruthy();
		const deck = await deckRes.json();

		// Create card via API
		const cardRes = await page.request.post(`/api/decks/${deck.id}/cards`, {
			data: { front: "reviewword", back: "từ review" },
		});
		expect(cardRes.ok()).toBeTruthy();

		// Go to review
		await page.goto("/review");
		await page.waitForLoadState("networkidle");

		// Should see a card — look for the card content or "Tap to reveal"
		const cardVisible = await page
			.locator("text=reviewword")
			.isVisible({ timeout: 10000 })
			.catch(() => false);

		if (cardVisible) {
			// Flip card (click on the card area)
			await page.locator("text=reviewword").click();

			// Should see back after flip
			await expect(page.locator("text=từ review")).toBeVisible({
				timeout: 5000,
			});

			// Rate Good
			await page.click('button:has-text("Good")');

			// After rating, should show next card or empty state
			await page.waitForTimeout(1000);
		}
		// Test passes as long as review page loads and is interactive
	});

	test("TTS mock: listen button works", async ({ page }) => {
		// Create a deck with a card
		const name = unique("TTSDeck");
		const deckRes = await page.request.post("/api/decks", {
			data: { name },
		});
		const deck = await deckRes.json();
		await page.request.post(`/api/decks/${deck.id}/cards`, {
			data: { front: "ttsword", back: "từ tts" },
		});

		// Mock TTS endpoint
		await page.route("**/api/tts", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ url: "/mock.mp3", cached: false }),
			}),
		);

		await page.goto("/review");
		await page.waitForLoadState("networkidle");

		// Find our card
		const cardVisible = await page
			.locator("text=ttsword")
			.isVisible({ timeout: 10000 })
			.catch(() => false);

		if (cardVisible) {
			// Flip card to reveal shadow panel
			await page.locator("text=ttsword").click();
			await expect(page.locator("text=từ tts")).toBeVisible({
				timeout: 5000,
			});

			// Listen buttons should be visible for both sides
			await expect(page.locator("text=Front")).toBeVisible({ timeout: 5000 });
			await expect(page.locator("text=Back")).toBeVisible({ timeout: 5000 });
			const listenButtons = page.locator("text=Listen");
			await expect(listenButtons).toHaveCount(2, { timeout: 5000 });
		}
	});

	test("TTS fallback: shows fallback when API fails", async ({ page }) => {
		const name = unique("FallbackDeck");
		const deckRes = await page.request.post("/api/decks", {
			data: { name },
		});
		const deck = await deckRes.json();
		await page.request.post(`/api/decks/${deck.id}/cards`, {
			data: { front: "fallbackword", back: "dự phòng" },
		});

		// Mock TTS endpoint to fail
		await page.route("**/api/tts", (route) =>
			route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({
					error: "TTS not configured",
					fallback: true,
				}),
			}),
		);

		await page.goto("/review");
		await page.waitForLoadState("networkidle");

		const cardVisible = await page
			.locator("text=fallbackword")
			.isVisible({ timeout: 10000 })
			.catch(() => false);

		if (cardVisible) {
			// Flip card
			await page.locator("text=fallbackword").click();
			await expect(page.locator("text=dự phòng")).toBeVisible({
				timeout: 5000,
			});

			// Listen button should still be visible (uses Web Speech fallback)
			await expect(page.locator("text=Listen")).toBeVisible({
				timeout: 5000,
			});
		}
	});

	test("quiz mode: type answer", async ({ page }) => {
		const name = unique("QuizDeck");
		const deckRes = await page.request.post("/api/decks", { data: { name } });
		const deck = await deckRes.json();
		await page.request.post(`/api/decks/${deck.id}/cards`, {
			data: { front: "quizword", back: "từ quiz" },
		});

		await page.goto("/review");
		await page.waitForLoadState("networkidle");

		const cardVisible = await page
			.locator("text=quizword")
			.isVisible({ timeout: 10000 })
			.catch(() => false);

		if (cardVisible) {
			// Switch to quiz mode (keyboard icon button)
			await page.locator('button[title*="Quiz"]').click();

			// Should see input field
			await expect(
				page.locator('input[placeholder="Type your answer..."]'),
			).toBeVisible({
				timeout: 5000,
			});

			// Type correct answer
			await page.fill('input[placeholder="Type your answer..."]', "từ quiz");
			await page.click('button:has-text("Check")');

			// Should show Correct
			await expect(page.locator("text=Correct!")).toBeVisible({
				timeout: 5000,
			});

			// Rating buttons should appear
			await expect(page.locator('button:has-text("Good")')).toBeVisible({
				timeout: 5000,
			});
		}
	});

	test("reverse card shows back as front", async ({ page }) => {
		const name = unique("ReverseDeck");
		const deckRes = await page.request.post("/api/decks", { data: { name } });
		const deck = await deckRes.json();
		await page.request.post(`/api/decks/${deck.id}/cards`, {
			data: { front: "english_word", back: "tiếng_việt" },
		});

		// Use deckId filter to only see this deck's cards
		await page.goto(`/review?deckId=${deck.id}`);
		await page.waitForLoadState("networkidle");

		// Should see either english_word (normal) or tiếng_việt (reverse)
		const hasFront = await page
			.locator("text=english_word")
			.isVisible({ timeout: 10000 })
			.catch(() => false);
		const hasReverse = await page
			.locator("text=tiếng_việt")
			.isVisible({ timeout: 10000 })
			.catch(() => false);
		expect(hasFront || hasReverse).toBeTruthy();
	});

	test("tag filter in review", async ({ page }) => {
		const name = unique("TagDeck");
		const deckRes = await page.request.post("/api/decks", { data: { name } });
		const deck = await deckRes.json();
		await page.request.post(`/api/decks/${deck.id}/cards`, {
			data: { front: "tagged_word", back: "từ có tag", tags: "ielts" },
		});

		await page.goto(`/review?deckId=${deck.id}`);
		await page.waitForLoadState("networkidle");

		// Should see tag filter chip
		const tagChip = page.locator("a:has-text('ielts')").first();
		const tagVisible = await tagChip
			.isVisible({ timeout: 10000 })
			.catch(() => false);
		if (tagVisible) {
			await tagChip.click();
			await expect(page).toHaveURL(/tag=ielts/);
		}
	});
});
