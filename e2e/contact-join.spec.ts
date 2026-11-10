import { expect, test } from '@playwright/test';

test('contact is the end of the home, and the old address leads there', async ({ page }) => {
  await page.goto('/ko/contact');
  await expect(page).toHaveURL(/\/ko$/);
  const contact = page.locator('#contact');
  await expect(contact).toContainText('제휴와 협업을 기다립니다');
  await expect(contact.getByRole('link', { name: '이메일로 문의하기' })).toHaveAttribute(
    'href',
    /^mailto:risecrew4@gmail\.com\?subject=/,
  );
  // The menu no longer has a contact page.
  await expect(page.locator('header a[href="/ko/contact"]')).toHaveCount(0);
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
