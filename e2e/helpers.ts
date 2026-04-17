export const TEST_EMAIL = "playwright-test@e2e.local";
export const TEST_PASSWORD = "test123456";

export const unique = (prefix: string) =>
	`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
