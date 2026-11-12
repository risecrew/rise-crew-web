import { expect, test } from '@playwright/test';
import { expectNoHorizontalScroll } from './helpers';

// The home of wireframe v1.1, §8.

test('the home opens on who we are, over a real photo that holds still', async ({ page }) => {
  await page.goto('/ko');
  const hero = page.locator('[data-hero]');
  await expect(hero).toContainText('성균관대학교 앵커사업단 산하 글로벌 창업 동아리');
  await expect(page.locator('h1')).toHaveText(/캠퍼스에서 세계로,\s*실행하는 창업가를 키웁니다/);
  await expect(hero).toContainText('25개 창업팀');
  await expect(hero.locator('img')).toHaveAttribute('alt', /주먹을 들어 올리고/);
  await expect(hero.locator('img')).toHaveAttribute('sizes', '100vw');
  // No scroll-held stage: the hero is one screen at most.
  const height = await hero.evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeLessThanOrEqual(880);
  await expect(hero.getByRole('link', { name: '지원 안내 보기' })).toHaveAttribute(
    'href',
    '/ko/join',
  );
  await expect(hero.getByRole('link', { name: '제휴 문의' })).toHaveAttribute('href', '#contact');
});

test('the numbers are plain text with one date for all of them', async ({ page }) => {
  await page.goto('/ko');
  const numbers = page.locator('section[aria-labelledby="numbers-title"]');
  for (const [value, label] of [
    ['90+', '멤버'],
    ['25', '창업팀'],
    ['33', '멘토'],
    ['25', '협력 기관'],
  ]) {
    await expect(numbers.locator('dl > div', { hasText: label }).locator('dd')).toContainText(
      value,
    );
  }
  await expect(numbers).toContainText('2026.11 기준');
  await expect(numbers.getByRole('link', { name: '협력 기관 25곳 전체 보기' })).toHaveAttribute(
    'href',
    '/ko/network#partners',
  );
});

test('the three stages are three cards built the same way', async ({ page }) => {
  await page.goto('/ko');
  const cards = page.locator('section[aria-labelledby="stages-title"] ol > li');
  await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) {
    await expect(card.locator('h3')).toHaveCount(1);
    await expect(card.locator('ul > li')).toHaveCount(3);
  }
  await expect(page.getByText('모든 단계에 멘토 33명이 함께합니다')).toBeVisible();
});

test('recent activities: names and "place · date", no awards in the name', async ({ page }) => {
  await page.goto('/ko');
  const recent = page.locator('section[aria-labelledby="recent-title"]');
  await expect(recent.locator('article')).toHaveCount(5);
  await expect(recent.locator('article').first()).toContainText(
    '2회 SKKU 창업팀 라운드테이블 워크숍',
  );
  await expect(recent).toContainText('싱가포르 · 2025.12.22–12.26');
  await expect(recent).not.toContainText('최우수상');
  await expect(recent).not.toContainText('1박 2일');
});

test('the partnership block writes the address out once, with copy and mail', async ({ page }) => {
  await page.goto('/ko');
  const contact = page.locator('#contact');
  await expect(contact.getByRole('heading', { level: 2 })).toHaveText(
    '함께할 기업과 기관을 찾습니다',
  );
  await expect(contact.getByRole('heading', { level: 3 })).toHaveText([
    '기업·기관 협력',
    '멘토 참여',
    '언론·취재',
  ]);
  await expect(contact.getByText('risecrew4@gmail.com')).toBeVisible();
  await expect(contact.getByRole('button', { name: '주소 복사' })).toBeVisible();
  await expect(contact.getByRole('link', { name: '메일 쓰기' })).toHaveAttribute(
    'href',
    /^mailto:risecrew4@gmail\.com\?subject=/,
  );
  // Written out once on the page: the footer leads here instead.
  await expect(page.getByText('risecrew4@gmail.com', { exact: true })).toHaveCount(1);
});

test('nothing on the home holds the scroll or overflows', async ({ page }) => {
  await page.goto('/ko');
  await expect(page.locator('[data-chapter], [data-gallery]')).toHaveCount(0);
  await expectNoHorizontalScroll(page);
});

test('the numbers count up once as they scroll in, and a screen reader hears each once', async ({
  page,
}) => {
  await page.goto('/ko');
  const members = page
    .locator('section[aria-labelledby="numbers-title"] dl > div', { hasText: '멤버' })
    .locator('dd');
  const digits = members.locator('[aria-hidden] > span').last();
  // Below the fold, the number waits at zero.
  await expect(digits).toHaveText('0+');
  await members.scrollIntoViewIfNeeded();
  await expect(digits).toHaveText('90+');
  // The counting digits are hidden from screen readers; the final value is read once.
  await expect(members.locator('.sr-only')).toHaveText('90+');
});

test('with reduced motion the numbers never count', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/ko');
  const digits = page
    .locator('section[aria-labelledby="numbers-title"] dl > div', { hasText: '멤버' })
    .locator('dd [aria-hidden] > span')
    .last();
  await expect(digits).toHaveText('90+');
});
