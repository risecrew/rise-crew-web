import { expect, test } from '@playwright/test';

test('about shows the five-step plan, programs, crew and the event timeline', async ({ page }) => {
  await page.goto('/ko/about');
  await expect(page.getByRole('heading', { name: '5단계 육성 플랜' })).toBeVisible();
  await expect(page.locator('[data-step]')).toHaveCount(5);
  await expect(page.getByText('VCC (Venture Creation Course)')).toBeVisible();
  await expect(
    page.getByText('운영진의 이름과 사진은 게시 동의를 받은 뒤 공개합니다.'),
  ).toBeVisible();
  await expect(page.getByText('신동원')).toBeVisible(); // faculty advisor, public mentor record
  expect(await page.locator('[data-event]').count()).toBeGreaterThan(10);
});

test('timeline: past planned dates read unconfirmed, future ones upcoming', async ({ page }) => {
  await page.goto('/en/about');
  const london = page.locator('[data-event]', { hasText: 'London' });
  await expect(london).toHaveAttribute('data-state', 'unconfirmed');
  await expect(london).toContainText('Unconfirmed');
  const final = page.locator('[data-event]', { hasText: 'AI+X Global Startup Competition final' });
  await expect(final).toHaveAttribute('data-state', 'upcoming');
});

test('the page cover shows a real photo marked temporary', async ({ page }) => {
  await page.goto('/ko/about');
  const cover = page.locator('[data-page-cover]');
  await expect(cover.locator('img')).toHaveAttribute('alt', /바이브코딩/);
  await expect(cover).toContainText('임시 사진');
});
