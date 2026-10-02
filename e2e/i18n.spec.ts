import { expect, test } from '@playwright/test';

test.describe('English browser', () => {
  test.use({ locale: 'en-US', extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' } });
  test('root redirects to /en', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/en$/);
  });
});

test.describe('Japanese browser', () => {
  test.use({ locale: 'ja-JP', extraHTTPHeaders: { 'Accept-Language': 'ja-JP,ja;q=0.9' } });
  test('root falls back to /ko', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/ko$/);
  });
});

test('unknown locale and unknown page return 404', async ({ page }) => {
  for (const path of ['/fr/about', '/ko/startups', '/en/archive']) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});
