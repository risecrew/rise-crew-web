import { expect, test } from '@playwright/test';

test('the deck opens on the slogan over a real photo', async ({ page }) => {
  await page.goto('/ko');
  const h1 = page.locator('h1');
  await expect(h1).toContainText('Reach your vision');
  await expect(h1).toContainText('Elevate your future');
  await expect(page.locator('[data-scene]').first().locator('img')).toHaveAttribute(
    'alt',
    /워크숍/,
  );
});

test('the deck has eleven scenes and every photo scene is marked temporary', async ({ page }) => {
  await page.goto('/ko');
  await expect(page.locator('[data-scene]')).toHaveCount(11);
  const photoScenes = page.locator('[data-scene][data-photo]');
  await expect(photoScenes).toHaveCount(6);
  for (const scene of await photoScenes.all()) await expect(scene).toContainText('임시 사진');
});

test('traction numbers land on their real values once scrolled into view', async ({ page }) => {
  await page.goto('/ko');
  const traction = page.locator('[data-scene="traction"]');
  await traction.scrollIntoViewIfNeeded();
  for (const value of ['90+', '22+', '33']) {
    await expect(traction.locator('[data-count]', { hasText: value }).first()).toBeVisible({
      timeout: 4000,
    });
  }
  await expect(traction).toContainText('2026.01 기준');
});

test('the progress counter follows the deck', async ({ page }) => {
  await page.goto('/ko');
  const counter = page.locator('[data-deck-counter]');
  await expect(counter).toHaveText('01 / 11');
  await page.locator('[data-scene="route"]').scrollIntoViewIfNeeded();
  await expect(counter).not.toHaveText('01 / 11');
});

test('the ask slide leads to the join page while recruitment is closed', async ({ page }) => {
  await page.goto('/ko');
  const ask = page.locator('[data-scene="ask"]');
  await expect(ask.getByRole('link', { name: '모집 안내 보기' })).toHaveAttribute(
    'href',
    '/ko/join',
  );
  await expect(ask.getByRole('link', { name: '제휴 문의' })).toHaveAttribute('href', '/ko/contact');
});

test.describe('without JavaScript and with reduced motion', () => {
  test.use({ javaScriptEnabled: false, reducedMotion: 'reduce' });

  test('every scene is readable and the numbers show their final values', async ({ page }) => {
    await page.goto('/ko');
    await expect(page.locator('[data-scene]')).toHaveCount(11);
    const traction = page.locator('[data-scene="traction"]');
    for (const value of ['90+', '22+', '33']) {
      await expect(traction.locator('[data-count]', { hasText: value }).first()).toBeAttached();
    }
    await expect(page.locator('[data-scene="ask"]')).toContainText('다음 무대의 주인공을 찾습니다');
  });
});
