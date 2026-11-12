import { expect, test, type Page } from '@playwright/test';

async function openMenu(page: Page) {
  await page.getByRole('button', { name: '메뉴 열기' }).click();
  return page.locator('#site-menu');
}

test('the header stays at the top and leads to the join page', async ({ page, isMobile }) => {
  await page.goto('/ko/about');
  await page.mouse.wheel(0, 1200);
  const header = page.locator('[data-site-header]');
  await expect(header).toBeInViewport();
  expect(await header.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
  const where = isMobile ? await openMenu(page) : header;
  await expect(where.getByRole('link', { name: '지원 안내' })).toHaveAttribute('href', '/ko/join');
});

test('the menu marks the page the visitor is on', async ({ page, isMobile }) => {
  await page.goto('/ko/about');
  const where = isMobile ? await openMenu(page) : page.getByRole('navigation', { name: '주 메뉴' });
  await expect(where.getByRole('link', { name: '소개' })).toHaveAttribute('aria-current', 'page');
  await expect(where.getByRole('link', { name: '네트워크' })).not.toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('language switch keeps the current page', async ({ page }) => {
  await page.goto('/ko/about');
  await page.locator('header').getByRole('link', { name: '영어로 보기' }).click();
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

test.describe('phone menu', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only');

  test('opens over the page, navigates and closes', async ({ page }) => {
    await page.goto('/ko');
    const menu = await openMenu(page);
    await expect(menu).toBeVisible();
    await menu.getByRole('link', { name: '네트워크' }).click();
    await expect(page).toHaveURL(/\/ko\/network$/);
    await expect(menu).toBeHidden();
  });

  test('Escape and the close button close it, and focus goes back', async ({ page }) => {
    await page.goto('/ko');
    let menu = await openMenu(page);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(page.getByRole('button', { name: '메뉴 열기' })).toBeFocused();
    menu = await openMenu(page);
    await menu.getByRole('button', { name: '메뉴 닫기' }).click();
    await expect(menu).toBeHidden();
  });
});
