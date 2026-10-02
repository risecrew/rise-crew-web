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
