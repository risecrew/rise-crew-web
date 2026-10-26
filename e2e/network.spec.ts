import { expect, test } from '@playwright/test';

test('network lists 19 named mentors, partners and the MOU', async ({ page }) => {
  await page.goto('/en/network');
  await expect(page.locator('[data-mentor]')).toHaveCount(19);
  await expect(page.getByText('19 of our 33 mentors are listed by name.')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Partnership with Kakao Mobility' }),
  ).toBeVisible();
  await expect(page.getByText('SKKU ANCHOR Division').first()).toBeVisible();
});
