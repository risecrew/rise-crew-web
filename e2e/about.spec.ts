import { expect, test } from '@playwright/test';

// The about page of wireframe v1.1, §9: who we are, and nothing else.

test('about says who we are, who backs us and the milestones', async ({ page }) => {
  await page.goto('/ko/about');
  await expect(page.locator('h1')).toHaveText('RISE CREW');
  await expect(page.locator('[data-page-cover]')).toContainText(
    '성균관대학교 앵커사업단 산하 글로벌 창업 동아리',
  );
  await expect(page.getByRole('heading', { name: '앵커사업단과 함께합니다' })).toBeVisible();
  await expect(page.getByText('신동원 교수')).toBeVisible();
  const milestones = page.locator('section[aria-labelledby="milestones-title"] ol > li');
  await expect(milestones).toHaveCount(6);
  await expect(milestones.first()).toContainText('RISE CREW 1기 출범');
  // The growth plan, the programs and the full history live on other pages now; with no student
  // agreeing to be shown, there is no crew section either.
  await expect(page.getByRole('heading', { name: '5단계 육성 플랜' })).toHaveCount(0);
  await expect(page.locator('#crew-title')).toHaveCount(0);
  await expect(page.getByText('SKKU SPEC')).toHaveCount(0);
});

test('the page cover shows a real photo', async ({ page }) => {
  await page.goto('/ko/about');
  const cover = page.locator('[data-page-cover]');
  await expect(cover.locator('img')).toHaveAttribute('alt', /바이브코딩/);
});

test('the program page has the three stages and marks the one on screen', async ({ page }) => {
  await page.goto('/ko/program');
  await expect(page.locator('h1')).toHaveText('캠퍼스에서 세계까지, 3단계로 성장합니다');
  const tabs = page.getByRole('navigation', { name: '단계' });
  await expect(tabs.getByRole('link')).toHaveCount(3);
  for (const id of ['campus', 'domestic', 'global']) {
    await expect(page.locator(`section#${id} h3`).first()).toBeVisible();
  }
  await expect(page.getByText('Learner')).toHaveCount(0);
  await tabs.getByRole('link', { name: /해외/ }).click();
  await expect(page).toHaveURL(/#global$/);
  await expect(tabs.getByRole('link', { name: /해외/ })).toHaveAttribute('aria-current', 'true');
});
