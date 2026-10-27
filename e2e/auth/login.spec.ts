import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, expectNoHorizontalScroll } from '../helpers';
import {
  authCookies,
  createBlockedAccount,
  deleteAccount,
  requestSignInLink,
  signIn,
} from './helpers';
import { clearMessagesFor, latestLinkFor } from './mailpit';

// Phones keep the account entries inside the menu panel; on a desktop they sit in the bar.
async function openMenu(page: Page) {
  const summary = page.locator('header summary');
  if (await summary.isVisible()) await summary.click();
}

// The page's own message (Next also keeps an empty alert in the page for route announcements).
function notice(page: Page) {
  return page.locator('main').getByRole('alert');
}

// The circle with the first letter of the name, wherever this screen size shows it.
function initialCircle(page: Page) {
  return page.locator('header [data-account-initial]:visible');
}

const COPY = {
  ko: {
    title: '로그인',
    lead: '처음이면 로그인하면서 가입돼요',
    google: '구글로 계속하기',
    or: '또는',
    emailLabel: '이메일',
    submit: '로그인 링크 받기',
    invalid: '올바른 이메일 주소를 입력해 주세요.',
    checkInbox: '메일함을 확인해 주세요',
    resend: '링크 다시 받기',
    errors: {
      link: '링크가 만료됐거나 이미 사용됐어요. 다시 받아 주세요.',
      blocked: '이용이 제한된 계정이에요.',
      oauth: '구글 로그인을 마치지 못했어요. 다시 시도해 주세요.',
    },
  },
  en: {
    title: 'Sign in',
    lead: 'New here? Signing in creates your account',
    google: 'Continue with Google',
    or: 'or',
    emailLabel: 'Email',
    submit: 'Email me a sign-in link',
    invalid: 'Enter a valid email address.',
    checkInbox: 'Check your inbox',
    resend: 'Resend the link',
    errors: {
      link: 'That link has expired or was already used. Request a new one.',
      blocked: 'This account has been suspended.',
      oauth: "Google sign-in didn't finish. Please try again.",
    },
  },
} as const;

test('the header offers a sign-in link to a visitor who is signed out', async ({ page }) => {
  await page.goto('/ko/about');
  await page.waitForLoadState('networkidle');
  await openMenu(page);
  const link = page.locator('header').getByRole('link', { name: '로그인', exact: true });
  await expect(link).toBeVisible();
  // It brings the visitor back to the page they were on.
  await expect(link).toHaveAttribute('href', '/ko/login?next=%2Fko%2Fabout');
  await expect(initialCircle(page)).toHaveCount(0);
});

test('the English header says Sign in and keeps the English path', async ({ page }) => {
  await page.goto('/en');
  await page.waitForLoadState('networkidle');
  await openMenu(page);
  const link = page.locator('header').getByRole('link', { name: 'Sign in', exact: true });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '/en/login?next=%2Fen');
});

for (const locale of ['ko', 'en'] as const) {
  const t = COPY[locale];

  test.describe(`/${locale}/login`, () => {
    test('has the Google button and the email form', async ({ page }) => {
      const response = await page.goto(`/${locale}/login`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: t.title })).toBeVisible();
      await expect(page.getByText(t.lead)).toBeVisible();
      await expect(page.getByRole('button', { name: t.google })).toBeVisible();
      await expect(page.getByText(t.or, { exact: true })).toBeVisible();
      await expect(page.getByLabel(t.emailLabel)).toBeVisible();
      await expect(page.getByRole('button', { name: t.submit })).toBeEnabled();
      // Account screens stay out of search results.
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    });

    test('is accessible and does not scroll sideways', async ({ page }) => {
      const response = await page.goto(`/${locale}/login`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: t.title })).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectAccessible(page);
    });

    test('shows a field error for an address that is not valid', async ({ page }) => {
      await page.goto(`/${locale}/login`);
      const email = page.getByLabel(t.emailLabel);
      await email.fill('not-an-email');
      await page.getByRole('button', { name: t.submit }).click();

      await expect(page.getByText(t.invalid)).toBeVisible();
      await expect(email).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByRole('heading', { name: t.checkInbox })).toHaveCount(0);
      await expectAccessible(page);

      // Typing again takes the error away.
      await email.fill('someone@example.test');
      await expect(page.getByText(t.invalid)).toHaveCount(0);
    });

    for (const code of ['link', 'blocked', 'oauth'] as const) {
      test(`?error=${code} says what happened`, async ({ page }) => {
        await page.goto(`/${locale}/login?error=${code}`);
        await expect(notice(page)).toHaveText(t.errors[code]);
        // The form is still there to try again.
        await expect(page.getByLabel(t.emailLabel)).toBeVisible();
        await expectAccessible(page);
      });
    }
  });
}

test('an error code the page does not know shows no message', async ({ page }) => {
  await page.goto('/ko/login?error=whatever');
  await expect(page.getByRole('heading', { level: 1, name: '로그인' })).toBeVisible();
  await expect(notice(page)).toHaveCount(0);
});

test('asking for a link shows the inbox state, and the emailed link signs the visitor in', async ({
  page,
  baseURL,
}) => {
  const email = 'member@example.test';
  await clearMessagesFor(email);

  await page.goto('/ko/login?next=%2Fko%2Fabout');
  await page.getByLabel('이메일').fill(email);
  await page.getByRole('button', { name: '로그인 링크 받기' }).click();

  const heading = page.getByRole('heading', { level: 1, name: '메일함을 확인해 주세요' });
  await expect(heading).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  // Resending waits a minute, so nobody sends a pile of mails by clicking twice.
  await expect(page.getByRole('button', { name: /링크 다시 받기/ })).toBeDisabled();
  await expectAccessible(page);

  const link = new URL(await latestLinkFor(email));
  expect(link.origin).toBe(baseURL);
  expect(link.pathname).toBe('/ko/auth/confirm');
  expect(link.searchParams.get('next')).toBe('/ko/about');
  expect(link.searchParams.get('type')).toBe('email');
  expect(link.searchParams.get('token_hash')).toBeTruthy();

  await page.goto(link.toString());
  await expect(page).toHaveURL(`${baseURL}/ko/about`);
  await page.waitForLoadState('networkidle');

  await openMenu(page);
  await expect(initialCircle(page)).toHaveText('이');
  await expect(
    page.locator('header').getByRole('link', { name: '로그인', exact: true }),
  ).toHaveCount(0);
});

test('the English form sends the visitor back to the English page', async ({ page, baseURL }) => {
  // A different account than the test before it: Auth lets one account ask for a link once a second.
  const email = 'operator@example.test';
  await clearMessagesFor(email);

  await page.goto('/en/login?next=%2Fen%2Fabout');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Check your inbox' })).toBeVisible();

  const link = new URL(await latestLinkFor(email));
  expect(link.pathname).toBe('/en/auth/confirm');
  await page.goto(link.toString());
  await expect(page).toHaveURL(`${baseURL}/en/about`);
});

test('a next that leaves the site or the language is not carried into the link', async ({
  page,
}) => {
  const email = 'admin@example.test';
  await clearMessagesFor(email);

  await page.goto('/ko/login?next=https%3A%2F%2Fevil.example%2Fko');
  await page.getByLabel('이메일').fill(email);
  await page.getByRole('button', { name: '로그인 링크 받기' }).click();
  await expect(page.getByRole('heading', { name: '메일함을 확인해 주세요' })).toBeVisible();

  const link = new URL(await latestLinkFor(email));
  expect(link.searchParams.get('next')).toBe('/ko');
});

test('the resend button works once a minute has passed, and the address can be changed', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/ko/login');
  await clearMessagesFor('guest@example.test');
  await page.getByLabel('이메일').fill('guest@example.test');
  await page.getByRole('button', { name: '로그인 링크 받기' }).click();
  await expect(page.getByRole('heading', { name: '메일함을 확인해 주세요' })).toBeVisible();

  const resend = page.getByRole('button', { name: /링크 다시 받기/ });
  await expect(resend).toBeDisabled();
  await page.clock.fastForward(30_000);
  await expect(resend).toBeDisabled();
  await page.clock.fastForward(31_000);
  await expect(resend).toBeEnabled();

  // The page's clock is fake, but Auth's one-email-a-second limit runs on real time.
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await resend.click();
  await expect(page.getByText('링크를 다시 보냈어요.')).toBeVisible();
  await expect(resend).toBeDisabled();

  await page.getByRole('button', { name: '다른 이메일로 받기' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '로그인' })).toBeVisible();
  await expect(page.getByLabel('이메일')).toHaveValue('guest@example.test');
});

test('the Google button starts the sign-in with a way back to this site', async ({
  page,
  baseURL,
}) => {
  await page.goto('/ko/login?next=%2Fko%2Fabout');
  // Google is not set up on the local stack, so only the request that starts the flow is checked.
  const started = page.waitForRequest((request) => request.url().includes('/auth/v1/authorize'));
  await page.getByRole('button', { name: '구글로 계속하기' }).click();

  const url = new URL((await started).url());
  expect(url.searchParams.get('provider')).toBe('google');
  expect(url.searchParams.get('redirect_to')).toBe(
    `${baseURL}/ko/auth/callback?next=${encodeURIComponent('/ko/about')}`,
  );
});

test('a failed Google sign-in comes back to the login page with its own message', async ({
  request,
  baseURL,
}) => {
  // Google (through Supabase) returns to the callback with error parameters and no code.
  const response = await request.get(
    '/ko/auth/callback?next=%2Fko%2Fabout&error=access_denied&error_description=denied',
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(307);
  const location = new URL(response.headers()['location'], baseURL!);
  expect(location.pathname + location.search).toBe('/ko/login?error=oauth');
});

test.describe('a visitor who is already signed in', () => {
  test('is sent on to where they were heading', async ({ page, baseURL }) => {
    await signIn(page, 'member@example.test', baseURL!);

    await page.goto('/ko/login?next=%2Fko%2Fabout');
    await expect(page).toHaveURL(`${baseURL}/ko/about`);

    await page.goto('/en/login');
    await expect(page).toHaveURL(`${baseURL}/en`);
  });

  test('is not sent in a circle when the login page is where they were heading', async ({
    page,
    baseURL,
  }) => {
    await signIn(page, 'member@example.test', baseURL!);
    await page.goto('/ko/login?next=%2Fko%2Flogin');
    await expect(page).toHaveURL(`${baseURL}/ko`);
  });

  test('still sees the form and the message when the page was sent with an error', async ({
    page,
    baseURL,
  }) => {
    await signIn(page, 'member@example.test', baseURL!);
    await page.goto('/ko/login?error=link');
    await expect(page).toHaveURL(`${baseURL}/ko/login?error=link`);
    await expect(notice(page)).toHaveText(COPY.ko.errors.link);
  });

  test('has the menu with their page and sign-out', async ({ page, baseURL }) => {
    await signIn(page, 'member@example.test', baseURL!);
    await page.goto('/ko/about');
    await page.waitForLoadState('networkidle');

    await openMenu(page);
    const circle = initialCircle(page);
    await expect(circle).toHaveText('이');
    // On a desktop the links are behind the circle.
    const toggle = page.getByRole('button', { name: /계정 메뉴/ });
    if (await toggle.isVisible()) await toggle.click();

    const header = page.locator('header');
    await expect(header.getByRole('link', { name: '마이페이지' })).toBeVisible();
    // A member is not on the operator team.
    await expect(header.getByRole('link', { name: '관리', exact: true })).toHaveCount(0);

    await header.getByRole('button', { name: '로그아웃' }).click();
    await expect(page).toHaveURL(`${baseURL}/ko`);
    expect(authCookies(await page.context().cookies())).toEqual([]);
    await openMenu(page);
    await expect(header.getByRole('link', { name: '로그인', exact: true })).toBeVisible();
    await expect(initialCircle(page)).toHaveCount(0);
  });

  test('on the operator team also has the admin entry', async ({ page, baseURL }) => {
    await signIn(page, 'operator@example.test', baseURL!);
    await page.waitForLoadState('networkidle');

    await openMenu(page);
    await expect(initialCircle(page)).toHaveText('박');
    const toggle = page.getByRole('button', { name: /계정 메뉴/ });
    if (await toggle.isVisible()) await toggle.click();
    await expect(
      page.locator('header').getByRole('link', { name: '관리', exact: true }),
    ).toBeVisible();
  });

  test('can close the desktop menu with Escape', async ({ page, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the menu panel is a phone layout');
    await signIn(page, 'member@example.test', baseURL!);
    await page.waitForLoadState('networkidle');

    const toggle = page.getByRole('button', { name: /계정 메뉴/ });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
  });
});

test.describe('a blocked account', () => {
  test('is shown as signed out, with the reason', async ({ page, baseURL }, testInfo) => {
    const email = `blocked-${testInfo.project.name}-${Date.now()}@example.test`;
    try {
      await createBlockedAccount(email);
      await page.goto(await requestSignInLink(email, baseURL!));
      await page.waitForLoadState('networkidle');

      // There is a session, but no sign-in is shown for it.
      await page.goto('/ko/login');
      await expect(page).toHaveURL(`${baseURL}/ko/login`);
      await expect(notice(page)).toHaveText(COPY.ko.errors.blocked);

      await page.goto('/ko/about');
      await page.waitForLoadState('networkidle');
      await openMenu(page);
      await expect(
        page.locator('header').getByRole('link', { name: '로그인', exact: true }),
      ).toBeVisible();
      await expect(initialCircle(page)).toHaveCount(0);
    } finally {
      await deleteAccount(email);
    }
  });
});
