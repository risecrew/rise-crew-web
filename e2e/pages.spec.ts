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
