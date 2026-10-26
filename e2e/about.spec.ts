import { expect, test } from '@playwright/test';

test('about shows the five-step plan, programs, crew and the event timeline', async ({ page }) => {
  await page.goto('/ko/about');
  await expect(page.getByRole('heading', { name: '5단계 육성 플랜' })).toBeVisible();
  await expect(page.locator('[data-step]')).toHaveCount(5);
  await expect(page.getByText('VCC (Venture Creation Course)')).toBeVisible();
  await expect(
    page.getByText('운영진의 이름과 사진은 게시 동의를 받은 뒤 공개합니다.'),
  ).toBeVisible();
  await expect(page.getByText('신동원')).toBeVisible(); // faculty advisor, public mentor record
  expect(await page.locator('[data-event]').count()).toBeGreaterThan(10);
});

// Checks the rule, not a fixed date, so the test does not expire as the calendar moves.
test('timeline: past planned dates read unconfirmed, only future ones upcoming', async ({
  page,
}) => {
  await page.goto('/en/about');
  const events = await page.locator('[data-event]').evaluateAll((els) =>
    els.map((el) => ({
      state: el.getAttribute('data-state'),
      date: el.querySelector('time')?.getAttribute('datetime') ?? '',
      text: el.textContent ?? '',
    })),
  );
  const now = new Date();
  // A planned date like "2026-07" counts as past once that month is over.
  const isPast = (date: string) => {
    const [y, m = '12'] = date.split('-');
    return new Date(Number(y), Number(m), 1) <= now;
  };
  for (const e of events.filter((e) => e.state === 'upcoming')) {
    expect(isPast(e.date), `${e.text} is marked upcoming`).toBe(false);
  }
  const unconfirmed = events.filter((e) => e.state === 'unconfirmed');
  expect(unconfirmed.length).toBeGreaterThan(0);
  for (const e of unconfirmed) expect(e.text).toContain('Unconfirmed');
});

test('the page cover shows a real photo marked temporary', async ({ page }) => {
  await page.goto('/ko/about');
  const cover = page.locator('[data-page-cover]');
  await expect(cover.locator('img')).toHaveAttribute('alt', /바이브코딩/);
  await expect(cover).toContainText('임시 사진');
});
