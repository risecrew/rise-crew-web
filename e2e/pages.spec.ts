import { expect, test } from '@playwright/test';
import {
  collectConsoleErrors,
  expectAccessible,
  expectNoHorizontalScroll,
  LOCALES,
  PAGES,
} from './helpers';

for (const locale of LOCALES) {
  for (const path of PAGES) {
    test(`/${locale}${path} renders cleanly`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const response = await page.goto(`/${locale}${path}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('h1').first()).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectAccessible(page);
      expect(errors).toEqual([]);
    });
  }
}

// Inner pages open the way the home's chapters do: a photo from edge to edge with the title
// on it, not a framed screen beside the title.
for (const path of ['/about', '/network', '/contact', '/join'] as const) {
  test(`${path} opens on an edge-to-edge photo with the title on it`, async ({ page }) => {
    await page.goto(`/ko${path}`);
    const cover = page.locator('[data-page-cover]');
    const photo = await cover.locator('img').first().boundingBox();
    const viewport = page.viewportSize()!;
    expect(photo?.x).toBeLessThanOrEqual(0);
    expect(photo!.width).toBeGreaterThanOrEqual(viewport.width);
    const title = await cover.locator('h1').boundingBox();
    expect(title!.y).toBeGreaterThan(photo!.y);
    expect(title!.y + title!.height).toBeLessThanOrEqual(photo!.y + photo!.height);
  });
}

test('an unknown page has a title saying so', async ({ page }) => {
  await page.goto('/ko/startups');
  await expect(page).toHaveTitle(/페이지를 찾을 수 없습니다/);
});

test('following a link from far down a page lands at the top at once', async ({ page }) => {
  await page.goto('/ko');
  const ask = page.locator('[data-ask]');
  await ask.scrollIntoViewIfNeeded();
  await ask.getByRole('link', { name: '모집 안내 보기' }).click();
  await page.waitForURL('**/ko/join');
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('keyboard focus is visible on lime buttons', async ({ page }) => {
  await page.goto('/ko');
  await page.keyboard.press('Tab');
  const cta = page.locator('[data-hero]').getByRole('link', { name: '모집 안내 보기' });
  await cta.focus();
  const outline = await cta.evaluate((el) => getComputedStyle(el).outlineColor);
  expect(outline).toBe('rgb(159, 201, 82)');
});
