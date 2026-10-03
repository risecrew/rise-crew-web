import { expect, test } from '@playwright/test';

test('about shows the five-step plan, programs, crew and history', async ({ page }) => {
  await page.goto('/ko/about');
  await expect(page.getByRole('heading', { name: '5단계 육성 플랜' })).toBeVisible();
  await expect(page.locator('[data-step]')).toHaveCount(5);
  await expect(page.getByText('VCC (Venture Creation Course)')).toBeVisible();
  await expect(
    page.getByText('운영진의 이름과 사진은 게시 동의를 받은 뒤 공개합니다.'),
  ).toBeVisible();
  await expect(page.getByText('신동원')).toBeVisible(); // faculty advisor, public mentor record
  expect(await page.locator('[data-stamp]').count()).toBeGreaterThan(5);
});

test('history stamps: past planned dates read unconfirmed, and all stamps are visible', async ({
  page,
}) => {
  await page.goto('/en/about');
  const london = page.locator('[data-stamp]', { hasText: 'London' });
  await expect(london).toHaveAttribute('data-state', 'unconfirmed');
  await expect(london).toContainText('Unconfirmed');
  const stamps = page.locator('[data-stamp]');
  const count = await stamps.count();
  for (let i = 0; i < count; i++) {
    await stamps.nth(i).scrollIntoViewIfNeeded();
    await expect(stamps.nth(i)).toHaveCSS('opacity', '1');
  }
});

test.describe('history without JavaScript and with reduced motion', () => {
  test.use({ javaScriptEnabled: false, reducedMotion: 'reduce' });

  test('all stamps are visible immediately', async ({ page }) => {
    await page.goto('/ko/about');
    const opacities = await page
      .locator('[data-stamp]')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(opacities.length).toBeGreaterThan(5);
    expect(opacities.every((o) => o === '1')).toBe(true);
  });
});
