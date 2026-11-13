import { expect, test } from '@playwright/test';

test('network lists the named mentors, 25 partners by group and the agreement', async ({
  page,
}) => {
  await page.goto('/en/network');
  await expect(page.locator('[data-mentor]')).toHaveCount(19);
  await expect(page.getByText('Meet 19 featured mentors out of our 33.')).toBeVisible();
  const partners = page.locator('#partners');
  await expect(partners.locator('li')).toHaveCount(25);
  // Every partner shows its logo, with its name still written under it.
  await expect(partners.locator('li img')).toHaveCount(25);
  await expect(partners).toContainText('Kakao Mobility');
  await expect(partners.getByRole('heading', { level: 3 })).toHaveText([
    'Supporters',
    'Universities',
    'Companies',
  ]);
  await expect(partners).not.toContainText('SKKU SPEC');
  await expect(
    page.getByRole('heading', { name: 'Partnership with Kakao Mobility' }),
  ).toBeVisible();
});

test('the Korean page uses the corrected names', async ({ page }) => {
  await page.goto('/ko/network');
  const partners = page.locator('#partners');
  await expect(partners).toContainText('성균관대학교 앵커사업단');
  await expect(partners).toContainText('서울앵커센터');
  await expect(partners).toContainText('하노이외상대학교');
  await expect(page.locator('main')).not.toContainText('ANCHOR 사업단');
  await expect(page.locator('main')).not.toContainText('서울RISE센터');
});
