import { expect, test } from '@playwright/test';

test('the old contact address leads to the home', async ({ page }) => {
  await page.goto('/ko/contact');
  await expect(page).toHaveURL(/\/ko$/);
  await expect(page.locator('#contact')).toContainText('함께할 기업과 기관을 찾습니다');
  await expect(page.locator('header a[href="/ko/contact"]')).toHaveCount(0);
});

test('join shows the status, who can apply, six benefits and one answer at a time', async ({
  page,
}) => {
  await page.goto('/en/join');
  await expect(page.locator('h1')).toHaveText('Apply to RISE CREW');
  await expect(page.getByText('Closed', { exact: true })).toBeVisible();
  await expect(page.locator('table tbody tr')).toHaveCount(2);
  await expect(page.locator('[data-benefit]')).toHaveCount(6);
  await expect(page.locator('section[aria-labelledby="benefits-title"]')).not.toContainText(
    'internship',
  );
  const one = page.locator('details', {
    hasText: 'Can students from other universities or graduates join?',
  });
  const two = page.locator('details').first();
  await expect(one).not.toHaveAttribute('open', '');
  await one.locator('summary').click();
  await expect(one).toHaveAttribute('open', '');
  await two.locator('summary').click();
  await expect(two).toHaveAttribute('open', '');
  await expect(one).not.toHaveAttribute('open', '');
});

test('a link to a question opens its answer', async ({ page }) => {
  await page.goto('/ko/join#faq-other-schools');
  await expect(page.locator('#faq-other-schools')).toHaveAttribute('open', '');
});
