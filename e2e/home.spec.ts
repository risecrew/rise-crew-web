import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalScroll } from './helpers';

const CITIES = ['싱가포르', '도쿄', '마카오', '베트남'];

function rail(page: Page) {
  return page.getByRole('navigation', { name: 'RISE CREW 3단계' });
}

test('the home opens on the slogan over a real photo', async ({ page }) => {
  await page.goto('/ko');
  const h1 = page.locator('h1');
  await expect(h1).toContainText('Reach your vision');
  await expect(h1).toContainText('Elevate your future');
  const hero = page.locator('[data-hero]');
  await expect(hero.locator('img')).toHaveAttribute('alt', /워크숍/);
  await expect(hero).toContainText('임시 사진');
  await expect(page.locator('[data-slide-counter], [data-scene]')).toHaveCount(0);
});

test('traction numbers land on their real values once scrolled into view', async ({ page }) => {
  await page.goto('/ko');
  const traction = page.locator('[data-traction]');
  await traction.scrollIntoViewIfNeeded();
  for (const value of ['90+', '22+', '33']) {
    await expect(traction.locator('[data-count]', { hasText: value }).first()).toBeVisible({
      timeout: 4000,
    });
  }
  await expect(traction).toContainText('2026.01 기준');
});

test('the page runs Campus, Domestic, Global in order', async ({ page }) => {
  await page.goto('/ko');
  const ids = await page.locator('[data-chapter]').evaluateAll((els) => els.map((el) => el.id));
  expect(ids).toEqual(['campus', 'domestic', 'global']);
});

test('the stage rail appears with the chapters and marks the current one', async ({ page }) => {
  await page.goto('/ko');
  await expect(rail(page)).toBeHidden();
  await page.locator('#domestic').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await expect(rail(page)).toBeVisible();
  await expect(rail(page).getByRole('link', { name: /Domestic/ })).toHaveAttribute(
    'aria-current',
    'step',
  );
  await expect(rail(page).getByRole('link', { name: /Campus/ })).not.toHaveAttribute(
    'aria-current',
    'step',
  );
});

test('the Global gallery holds each city in date order', async ({ page }) => {
  await page.goto('/ko');
  const gallery = page.locator('[data-gallery]');
  await expect(gallery.locator('[data-city]')).toHaveText(CITIES);
  const stops = gallery.locator('[data-gallery-stop]');
  await expect(stops).toHaveCount(CITIES.length);
  for (const [i, city] of CITIES.entries()) {
    await stops.nth(i).evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect(gallery.locator('[data-city][aria-current="step"]')).toHaveText(city);
    // The caption on screen is this city's; it leads with the title, the city sits under it.
    const shown = gallery.locator('[data-caption]').filter({ visible: true });
    await expect
      .poll(() =>
        gallery
          .locator('[data-caption]')
          .evaluateAll((els) =>
            els.filter((el) => getComputedStyle(el).opacity === '1').map((el) => el.textContent),
          ),
      )
      .toEqual([expect.stringContaining(city)]);
    await expect(shown.first()).toBeAttached();
  }
  // Screen readers do not scroll, so every city stays reachable.
  await expect(gallery.locator('[data-caption][aria-hidden="true"]')).toHaveCount(0);
  for (const caption of await gallery.locator('[data-caption]').all()) {
    const first = await caption.evaluate((el) => el.firstElementChild?.tagName);
    expect(first).toBe('H4');
  }
  await expectNoHorizontalScroll(page);
});

test('chapter titles run across the content width', async ({ page }) => {
  await page.goto('/ko');
  for (const id of ['campus', 'domestic', 'global']) {
    const fit = await page.locator(`#${id}-title`).evaluate((el) => {
      // The word itself, not the block it sits in.
      const box = el.querySelector('[lang="en"]')!.getBoundingClientRect();
      const parent = el.parentElement!;
      const style = getComputedStyle(parent);
      const inner =
        parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      return { ratio: box.width / inner, right: box.right, viewport: innerWidth };
    });
    expect(fit.ratio).toBeGreaterThan(0.9);
    expect(fit.right).toBeLessThanOrEqual(fit.viewport);
  }
});

test('the header action says what happens while recruitment is closed', async ({
  page,
  isMobile,
}) => {
  await page.goto('/ko');
  if (isMobile) await page.locator('header summary').click();
  const header = page.locator('header');
  await expect(header.getByRole('link', { name: '모집 안내 보기' })).toHaveAttribute(
    'href',
    '/ko/join',
  );
  await expect(header.getByRole('link', { name: '지원하기' })).toHaveCount(0);
});

test('the ask leads to the join page while recruitment is closed', async ({ page }) => {
  await page.goto('/ko');
  const ask = page.locator('[data-ask]');
  await expect(ask.getByRole('link', { name: '모집 안내 보기' })).toHaveAttribute(
    'href',
    '/ko/join',
  );
  await expect(ask.getByRole('link', { name: '제휴 문의' })).toHaveAttribute('href', '/ko/contact');
});

async function expectFinalState(page: Page) {
  const traction = page.locator('[data-traction]');
  for (const count of await traction.locator('[data-count]').all()) {
    expect(Number(await count.evaluate((el) => getComputedStyle(el).fontWeight))).toBe(900);
  }
  const heroTransforms = await page.locator('[data-hero] img').evaluate((img) => {
    const out: string[] = [];
    for (let el: Element | null = img; el && !el.matches('[data-hero]'); el = el.parentElement)
      out.push(getComputedStyle(el).transform);
    return out;
  });
  expect(heroTransforms.every((t) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)')).toBe(true);
}

test.describe('with reduced motion and JavaScript on', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the page shows its final state: full-weight numbers, no zoom, a plain gallery', async ({
    page,
  }) => {
    await page.goto('/ko');
    await page.waitForLoadState('networkidle');
    await expectFinalState(page);
    await expect(page.locator('[data-gallery-stop]')).toHaveCount(0);
    await expect(page.locator('[data-gallery] [data-caption]')).toHaveCount(CITIES.length);
  });
});

test.describe('without JavaScript and with reduced motion', () => {
  test.use({ javaScriptEnabled: false, reducedMotion: 'reduce' });

  test('everything reads top to bottom with final numbers', async ({ page }) => {
    await page.goto('/ko');
    const traction = page.locator('[data-traction]');
    for (const value of ['90+', '22+', '33']) {
      await expect(traction.locator('[data-count]', { hasText: value }).first()).toBeAttached();
    }
    const gallery = page.locator('[data-gallery]');
    await expect(gallery.locator('[data-caption]')).toHaveCount(CITIES.length);
    for (const caption of await gallery.locator('[data-caption]').all()) {
      await expect(caption).toBeVisible();
      await expect(caption).not.toHaveAttribute('aria-hidden', 'true');
    }
    await expect(page.locator('[data-ask]')).toContainText('다음 무대의 주인공을 찾습니다');
    await expectFinalState(page);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('numbers and the opening photo render in their final state', async ({ page }) => {
    await page.goto('/ko');
    await expectFinalState(page);
  });
});
