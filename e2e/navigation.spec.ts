import { expect, test } from '@playwright/test';

test('language switch keeps the current page', async ({ page, isMobile }) => {
  await page.goto('/ko/about');
  if (isMobile) await page.getByText('메뉴', { exact: true }).click();
  await page.getByRole('link', { name: 'English' }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('skip link moves focus to main content', async ({ page }) => {
  await page.goto('/ko');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: '본문으로 건너뛰기' });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page).toHaveURL(/#main$/);
});

test.describe('mobile menu', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only');

  test('opens, navigates and closes', async ({ page }) => {
    await page.goto('/ko');
    await page.getByText('메뉴', { exact: true }).click();
    await page
      .getByRole('navigation', { name: '메뉴', exact: true })
      .getByRole('link', { name: '네트워크' })
      .click();
    await expect(page).toHaveURL(/\/ko\/network$/);
    await expect(page.locator('details[open]')).toHaveCount(0);
  });
});
