import { expect, test } from '@playwright/test';

test('cover shows the slogan, the stats with their basis and a working CTA', async ({ page }) => {
  await page.goto('/ko');
  const h1 = page.locator('h1');
  await expect(h1).toContainText('Reach your vision');
  await expect(h1).toContainText('Elevate your future');
  for (const value of ['90+', '22+', '33'])
    await expect(page.getByText(value, { exact: true }).first()).toBeVisible();
  await expect(page.getByText('2026.01 기준').first()).toBeVisible();
  // Recruitment is closed in phase 1 data, so the boarding pass must lead to the join page.
  await expect(page.getByRole('link', { name: /모집 안내 보기/ }).first()).toHaveAttribute(
    'href',
    '/ko/join',
  );
});

test('past planned stamps say unconfirmed, not upcoming', async ({ page }) => {
  await page.goto('/en');
  const london = page.locator('[data-stamp]', { hasText: 'London' });
  await expect(london).toHaveAttribute('data-state', 'unconfirmed');
  await expect(london).toContainText('Unconfirmed');
});

test('every stamp ends up inked after scrolling', async ({ page }) => {
  await page.goto('/ko');
  const stamps = page.locator('[data-stamp]');
  const count = await stamps.count();
  expect(count).toBeGreaterThan(5);
  for (let i = 0; i < count; i++) {
    await stamps.nth(i).scrollIntoViewIfNeeded();
    await expect(stamps.nth(i)).toHaveCSS('opacity', '1');
  }
});

test.describe('without JavaScript and with reduced motion', () => {
  test.use({ javaScriptEnabled: false, reducedMotion: 'reduce' });

  test('all stamps are visible immediately', async ({ page }) => {
    await page.goto('/ko');
    const opacities = await page
      .locator('[data-stamp]')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(opacities.length).toBeGreaterThan(5);
    expect(opacities.every((o) => o === '1')).toBe(true);
  });
});
