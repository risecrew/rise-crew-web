import { expect, test } from '@playwright/test';

test('the old contact address leads to the home', async ({ page }) => {
  await page.goto('/ko/contact');
  await expect(page).toHaveURL(/\/ko$/);
  await expect(page.locator('#contact')).toContainText('함께할 기업과 기관을 찾습니다');
  await expect(page.locator('header a[href="/ko/contact"]')).toHaveCount(0);
});

test('join shows closed status, eligibility, benefits and an expandable FAQ', async ({ page }) => {
  await page.goto('/en/join');
  await expect(page.getByText('Not recruiting right now')).toBeVisible();
  await expect(page.locator('[data-benefit]')).toHaveCount(6);
  const item = page.locator('details', {
    hasText: 'Can students from other universities or graduates join?',
  });
  await expect(item).not.toHaveAttribute('open', '');
  await item.locator('summary').click();
  await expect(item).toHaveAttribute('open', '');
  await expect(item.locator('p')).toBeVisible();
});
