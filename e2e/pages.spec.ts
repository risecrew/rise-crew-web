import { expect, test } from '@playwright/test';
import { PRIVACY_POLICY_VERSION } from '@/lib/auth/profile';
import {
  collectConsoleErrors,
  expectAccessible,
  expectNoHorizontalScroll,
  LOCALES,
  PAGES,
} from './helpers';

for (const locale of LOCALES) {
  for (const path of PAGES) {
    test(`/${locale}${path} renders cleanly`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const response = await page.goto(`/${locale}${path}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('h1').first()).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectAccessible(page);
      expect(errors).toEqual([]);
    });
  }
}

// Inner pages open the way the home's chapters do: a photo from edge to edge with the title
// on it, not a framed screen beside the title.
for (const path of ['/about', '/network', '/contact', '/join'] as const) {
  test(`${path} opens on an edge-to-edge photo with the title on it`, async ({ page }) => {
    await page.goto(`/ko${path}`);
    const cover = page.locator('[data-page-cover]');
    const photo = await cover.locator('img').first().boundingBox();
    const viewport = page.viewportSize()!;
    expect(photo?.x).toBeLessThanOrEqual(0);
    expect(photo!.width).toBeGreaterThanOrEqual(viewport.width);
    const title = await cover.locator('h1').boundingBox();
    expect(title!.y).toBeGreaterThan(photo!.y);
    expect(title!.y + title!.height).toBeLessThanOrEqual(photo!.y + photo!.height);
  });
}

test('an unknown page has a title saying so', async ({ page }) => {
  await page.goto('/ko/startups');
  await expect(page).toHaveTitle(/페이지를 찾을 수 없습니다/);
});

test('following a link from far down a page lands at the top at once', async ({ page }) => {
  await page.goto('/ko');
  const ask = page.locator('[data-ask]');
  await ask.scrollIntoViewIfNeeded();
  await ask.getByRole('link', { name: '모집 안내 보기' }).click();
  await page.waitForURL('**/ko/join');
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('keyboard focus is visible on lime buttons', async ({ page }) => {
  await page.goto('/ko');
  await page.keyboard.press('Tab');
  const cta = page.locator('[data-hero]').getByRole('link', { name: '모집 안내 보기' });
  await cta.focus();
  const outline = await cta.evaluate((el) => getComputedStyle(el).outlineColor);
  expect(outline).toBe('rgb(159, 201, 82)');
});

test('fonts load from the site itself, not a third-party CDN', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    const host = new URL(r.url()).host;
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) external.push(r.url());
  });
  await page.goto('/ko');
  await page.evaluate(() => document.fonts.ready);
  expect(external).toEqual([]);
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family),
  );
  expect(loaded.some((f) => f.includes('Wanted Sans Variable'))).toBe(true);
  expect(loaded.some((f) => f.includes('Pretendard Variable'))).toBe(true);
});

// Accounts are off in this suite (no NEXT_PUBLIC_AUTH_ENABLED), so the site looks as it did before
// they existed: no sign-in entry in the header and no login page. The same checks with the switch
// on are in e2e/auth/login.spec.ts.
for (const locale of LOCALES) {
  test(`/${locale} header has no sign-in entry while accounts are off`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await page.waitForLoadState('networkidle');
    // Counted in the markup, not by what is visible: the phone menu panel is closed.
    await expect(page.locator('header a[href*="/login"]')).toHaveCount(0);
    await expect(page.locator('header [data-account-initial]')).toHaveCount(0);
    await expect(page.locator('header').getByText(/^(로그인|Sign in)$/)).toHaveCount(0);
  });

  test(`/${locale}/login is a 404 while accounts are off`, async ({ page }) => {
    const response = await page.goto(`/${locale}/login`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/이메일|Email/)).toHaveCount(0);
  });
}

// The privacy policy. It is a draft until the operators and the ANCHOR Division approve it, and it
// is reviewed on the site with accounts off, so it has to be there in this suite. It stays out of
// the sitemap (see e2e/seo.spec.ts) until the accounts are launched.
const POLICY = {
  ko: {
    title: '개인정보 처리방침',
    officer: [
      '개인정보 보호책임자: RISE CREW 회장 (risecrew4@gmail.com)',
      '개인정보 처리 담당: 웹사이트 관리자',
    ],
    headings: [
      '개인정보 수집·이용 목적',
      '수집하는 항목',
      '보유 기간',
      '처리를 맡기는 곳',
      '열람할 수 있는 사람',
      '이용자의 권리',
      '만 14세 미만',
      '개인정보 보호책임자',
      '시행일과 버전',
    ],
    notCollected: /전화번호와 학번은 받지 않습니다/,
    footerLink: '개인정보 처리방침',
    // The sign-in emails go out through the club's Gmail account, so Google is more than the
    // Google sign-in button.
    googleSender: /Gmail 계정이 로그인 이메일을 보냅니다/,
    // A Gmail filter on the sending account moves every sign-in email to Trash when it is sent,
    // and Gmail empties Trash after 30 days. Nobody deletes anything by hand.
    sentCopies: /30일 안에 자동으로 삭제됩니다/,
    oldChore: /보낸 편지함|운영진이 주기적으로/,
    languageCookie: /언어를 기억하는 쿠키/,
    passiveProfile: /기본 프로필/,
    passiveLogs: /접속 기록\(IP 주소, 브라우저 정보, 접속 시각\)/,
    // An account that signs in and never finishes the sign-up form: deleted after 7 days, and
    // not shown to the staff.
    unfinishedRetention:
      /가입 정보 입력을 마치지 않은 계정은 만든 지 7일이 지나면 자동으로 삭제합니다/,
    unfinishedRights: /만든 지 7일이 지나면 자동으로 삭제됩니다/,
    staffRow: '운영진과 관리자',
    staffFinishedOnly: /가입 정보 입력을 마치지 않은 계정은 보지 못합니다/,
  },
  en: {
    title: 'Privacy policy',
    officer: [
      'Privacy officer: RISE CREW President (risecrew4@gmail.com)',
      'Data handling: Website administrator',
    ],
    headings: [
      'Why we use your information',
      'What we collect',
      'How long we keep it',
      'Who processes it for us',
      'Who can see it',
      'Your rights',
      'People under 14',
      'Privacy officer',
      'Effective date and version',
    ],
    notCollected: /We do not collect phone numbers or student IDs/,
    footerLink: 'Privacy policy',
    googleSender: /Gmail account sends the sign-in emails/,
    sentCopies: /deleted automatically within 30 days/,
    oldChore: /Sent folder|operators delete them periodically/,
    languageCookie: /remembers that language/,
    passiveProfile: /basic profile Google shares/,
    passiveLogs: /access logs automatically \(IP address, browser, and times\)/,
    unfinishedRetention:
      /never finish the sign-up form, the account is deleted automatically 7 days after it was created/,
    unfinishedRights: /deleted automatically 7 days after it was created/,
    staffRow: 'Operators and admins',
    staffFinishedOnly: /do not see accounts that never finished the sign-up form/,
  },
} as const;

for (const locale of LOCALES) {
  const copy = POLICY[locale];

  test(`/${locale}/privacy renders cleanly while accounts are off`, async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const response = await page.goto(`/${locale}/privacy`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('heading', { level: 1, name: copy.title })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
    expect(errors).toEqual([]);
  });

  test(`/${locale}/privacy gives the officer lines and the version date`, async ({ page }) => {
    await page.goto(`/${locale}/privacy`);
    const main = page.locator('main');
    for (const line of copy.officer) {
      await expect(main.getByText(line, { exact: true })).toBeVisible();
    }
    // The officer's address is a link, so it can be written to straight from the page.
    await expect(main.getByRole('link', { name: 'risecrew4@gmail.com' }).first()).toHaveAttribute(
      'href',
      'mailto:risecrew4@gmail.com',
    );
    const date = main.locator('time');
    await expect(date).toHaveText(PRIVACY_POLICY_VERSION);
    await expect(date).toHaveAttribute('datetime', PRIVACY_POLICY_VERSION);
  });

  test(`/${locale}/privacy covers every section of the spec, in its order`, async ({ page }) => {
    await page.goto(`/${locale}/privacy`);
    const headings = await page.locator('main h2').allTextContents();
    // Each heading starts with its number ("1."), which the copy above leaves out.
    expect(headings.map((h) => h.replace(/^\d+\.\s*/, ''))).toEqual(copy.headings);
    // Said plainly, as the spec asks: no phone numbers and no student IDs.
    await expect(page.locator('main')).toContainText(copy.notCollected);
    await expect(page.locator('main')).toContainText('Supabase');
    await expect(page.locator('main')).toContainText('Vercel');
    await expect(page.locator('main')).toContainText('Google');
  });

  test(`/${locale}/privacy tells the whole story of who sends mail, what is stored and what is kept`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/privacy`);
    const main = page.locator('main');
    // Google is one processor row that covers both of its jobs: the sign-in button and the Gmail
    // account the sign-in emails are sent from.
    const google = main
      .locator('dl > div')
      .filter({ has: page.locator('dt', { hasText: /^Google$/ }) });
    await expect(google).toHaveCount(1);
    await expect(google).toContainText(copy.googleSender);
    // The copies in the sending mailbox are not touched by deleting an account. They go away on their
    // own within 30 days, and both places that mention them say so: the Google row and retention.
    await expect(google).toContainText(copy.sentCopies);
    const retention = main.locator('section[aria-labelledby="privacy-retention"]');
    await expect(retention).toContainText(copy.sentCopies);
    // No operator chore and no Sent folder are promised any more: the filter does the deleting.
    await expect(google).not.toContainText(copy.oldChore);
    await expect(retention).not.toContainText(copy.oldChore);
    // Cookies: the language cookie is named next to the sign-in one.
    const items = main.locator('section[aria-labelledby="privacy-items"]');
    await expect(items).toContainText(copy.languageCookie);
    // What arrives without being asked for: the Google profile and the providers' access logs.
    await expect(items).toContainText(copy.passiveProfile);
    await expect(items).toContainText(copy.passiveLogs);
  });

  test(`/${locale}/privacy says an unfinished sign-up is deleted after 7 days and hidden from the staff`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/privacy`);
    const main = page.locator('main');
    await expect(main.locator('section[aria-labelledby="privacy-retention"]')).toContainText(
      copy.unfinishedRetention,
    );
    // Deleting it sooner is still a request by email.
    const rights = main.locator('section[aria-labelledby="privacy-rights"]');
    await expect(rights).toContainText(copy.unfinishedRights);
    await expect(rights.getByRole('link', { name: 'risecrew4@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:risecrew4@gmail.com',
    );
    const staff = main
      .locator('section[aria-labelledby="privacy-visibility"] dl > div')
      .filter({ has: page.locator('dt', { hasText: copy.staffRow }) });
    await expect(staff).toHaveCount(1);
    await expect(staff).toContainText(copy.staffFinishedOnly);
  });

  test(`/${locale}/privacy is reachable from the footer of every page`, async ({ page }) => {
    for (const path of PAGES) {
      await page.goto(`/${locale}${path}`);
      const link = page.locator('footer').getByRole('link', { name: copy.footerLink });
      await expect(link).toHaveAttribute('href', `/${locale}/privacy`);
    }
    await page.locator('footer').getByRole('link', { name: copy.footerLink }).click();
    await page.waitForURL(`**/${locale}/privacy`);
    await expect(page.getByRole('heading', { level: 1, name: copy.title })).toBeVisible();
  });
}
