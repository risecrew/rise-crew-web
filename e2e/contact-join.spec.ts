import { expect, test } from '@playwright/test';

test('contact offers email and a prefilled partnership mail', async ({ page }) => {
  await page.goto('/ko/contact');
  await expect(page.getByRole('link', { name: 'risecrew4@gmail.com' }).first()).toHaveAttribute(
    'href',
    'mailto:risecrew4@gmail.com',
  );
  const partner = page.getByRole('link', { name: '제휴 문의' }).last();
  await expect(partner).toHaveAttribute('href', /^mailto:risecrew4@gmail\.com\?subject=/);
});

test('join shows closed status, eligibility, benefits and an expandable FAQ', async ({ page }) => {
  await page.goto('/en/join');
  await expect(page.getByText('Not recruiting right now')).toBeVisible();
  await expect(page.locator('[data-benefit]')).toHaveCount(7);
  const item = page.locator('details', {
    hasText: 'Can students from other universities or graduates join?',
  });
  await expect(item).not.toHaveAttribute('open', '');
  await item.locator('summary').click();
  await expect(item).toHaveAttribute('open', '');
  await expect(item.locator('p')).toBeVisible();
});
