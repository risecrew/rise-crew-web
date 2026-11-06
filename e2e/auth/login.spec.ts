import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, expectNoHorizontalScroll } from '../helpers';
import {
  TEST_PASSWORD,
  adminClient,
  anonymousClient,
  authCookies,
  createBlockedAccount,
  createOnboardedAccount,
  createPasswordAccount,
  deleteAccount,
  setTestPassword,
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

// The newest mail's link right now, without waiting for one to arrive.
async function latestLinkForNow(email: string): Promise<string | null> {
  const base = process.env.E2E_MAILPIT_URL ?? 'http://127.0.0.1:54324';
  const query = encodeURIComponent(`to:${email}`);
  const response = await fetch(`${base}/api/v1/search?query=${query}`);
  const { messages } = (await response.json()) as { messages: { ID: string }[] };
  return messages[0]?.ID ?? null;
}

function anonymousSignIn(email: string, password: string) {
  return anonymousClient().auth.signInWithPassword({ email, password });
}

const COPY = {
  ko: {
    title: '로그인',
    lead: '이메일과 비밀번호로 로그인해요',
    google: '구글로 계속하기',
    or: '또는',
    emailLabel: '이메일',
    submit: '로그인',
    invalid: '올바른 이메일 주소를 입력해 주세요.',
    checkInbox: '메일함을 확인해 주세요',
    resend: '링크 다시 받기',
    errors: {
      link: '링크가 만료됐거나 이미 사용됐어요. 다시 요청해 주세요.',
      blocked: '이용이 제한된 계정이에요.',
      oauth: '구글 로그인을 마치지 못했어요. 다시 시도해 주세요.',
    },
    // The quiet line under the sign-in options, and its link.
    storage: '가입하면 이메일 주소가 저장돼요. 가입 정보를 입력하지 않으면 7일 뒤 삭제돼요.',
    policyLink: '개인정보 처리방침',
    policyTitle: '개인정보 처리방침',
  },
  en: {
    title: 'Sign in',
    lead: 'Sign in with your email and password',
    google: 'Continue with Google',
    or: 'or',
    emailLabel: 'Email',
    submit: 'Sign in',
    invalid: 'Enter a valid email address.',
    checkInbox: 'Check your inbox',
    resend: 'Resend the link',
    errors: {
      link: 'That link has expired or was already used. Request a new one.',
      blocked: 'This account has been suspended.',
      oauth: "Google sign-in didn't finish. Please try again.",
    },
    storage:
      'Signing up stores your email address. If you never finish the sign-up form, it is deleted after 7 days.',
    policyLink: 'Privacy policy',
    policyTitle: 'Privacy policy',
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
      const google = page.getByRole('button', { name: t.google });
      await expect(google).toBeVisible();
      // Google's own mark sits before the label; it is decoration, so the name stays the label.
      await expect(google.locator('svg[aria-hidden="true"]')).toHaveCount(1);
      await expect(page.getByText(t.or, { exact: true })).toBeVisible();
      await expect(page.getByLabel(t.emailLabel)).toBeVisible();
      await expect(page.getByRole('button', { name: t.submit, exact: true })).toBeEnabled();
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
      await page.getByRole('button', { name: t.submit, exact: true }).click();

      await expect(page.getByText(t.invalid)).toBeVisible();
      await expect(email).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByRole('heading', { name: t.checkInbox })).toHaveCount(0);
      await expectAccessible(page);

      // Typing again takes the error away.
      await email.fill('someone@example.test');
      await expect(page.getByText(t.invalid)).toHaveCount(0);
    });

    test('announces the field error when the form is sent with Enter', async ({ page }) => {
      await page.goto(`/${locale}/login`);
      const email = page.getByLabel(t.emailLabel);
      // The input already has focus when Enter is pressed (as with a phone keyboard's send key),
      // so moving focus to it announces nothing: the message itself has to be an alert.
      await email.fill('not-an-email');
      await email.press('Enter');
      await expect(email).toHaveAttribute('aria-invalid', 'true');
      await expect(notice(page)).toHaveText(t.invalid);

      // The same address sent again is announced again: the message is a fresh element.
      await notice(page).evaluate((el) => el.setAttribute('data-seen', ''));
      await email.press('Enter');
      await expect(page.locator('main [data-seen]')).toHaveCount(0);
      await expect(notice(page)).toHaveText(t.invalid);
    });

    test('says under the sign-in options what signing in stores, with the policy a tap away', async ({
      page,
      baseURL,
    }) => {
      await page.goto(`/${locale}/login`);
      const main = page.locator('main');
      const line = main.getByText(t.storage, { exact: true });
      await expect(line).toBeVisible();
      // Quiet: small, in the soft white of the account screens.
      await expect(line).toHaveCSS('font-size', '14px');
      await expect(line).toHaveCSS('color', /\/ 0\.75\)$|, 0\.75\)$/);
      // Under the sign-in options: below the button that sends the link.
      const submit = (await page
        .getByRole('button', { name: t.submit, exact: true })
        .boundingBox())!;
      expect((await line.boundingBox())!.y).toBeGreaterThan(submit.y + submit.height);

      // The policy is one tap away: an underlined link, as tall as a finger.
      const link = main.getByRole('link', { name: t.policyLink, exact: true });
      await expect(link).toHaveAttribute('href', `/${locale}/privacy`);
      await expect(link).toHaveCSS('text-decoration-line', 'underline');
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expectNoHorizontalScroll(page);

      await link.click();
      await expect(page).toHaveURL(`${baseURL}/${locale}/privacy`);
      await expect(page.getByRole('heading', { level: 1, name: t.policyTitle })).toBeVisible();
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

// The password box, not the button beside it that shows the password.
function passwordBox(page: Page, label = '비밀번호') {
  return page.getByLabel(label, { exact: true });
}

async function signUpForm(page: Page, email: string) {
  await page.getByLabel('이메일').fill(email);
  await page.getByRole('button', { name: '가입하기' }).click();
}

function uniqueEmail(name: string, testInfo: { project: { name: string } }) {
  return `${name}-${testInfo.project.name}-${Date.now()}@example.test`;
}

test('an email and password sign in without any mail, and go where the visitor was heading', async ({
  page,
  baseURL,
}, testInfo) => {
  const email = uniqueEmail('password', testInfo);
  await createOnboardedAccount(email);
  await setTestPassword(email);
  try {
    await clearMessagesFor(email);
    await page.goto('/ko/login?next=%2Fko%2Fabout');
    await page.getByLabel('이메일').fill(email);
    await passwordBox(page).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}/ko/about`);
    await page.waitForLoadState('networkidle');
    await openMenu(page);
    await expect(
      page.locator('header').getByRole('link', { name: '로그인', exact: true }),
    ).toHaveCount(0);
    expect(await latestLinkForNow(email)).toBeNull();
  } finally {
    await deleteAccount(email);
  }
});

test('a wrong password says so without saying which part was wrong, and is not kept', async ({
  page,
}, testInfo) => {
  const email = uniqueEmail('wrong', testInfo);
  await createPasswordAccount(email);
  try {
    for (const address of [email, `nobody-${email}`]) {
      await page.goto('/ko/login');
      await page.getByLabel('이메일').fill(address);
      await passwordBox(page).fill('not-the-password-1');
      await page.getByRole('button', { name: '로그인', exact: true }).click();
      await expect(notice(page)).toContainText('이메일이나 비밀번호가 맞지 않아요.');
      await expect(passwordBox(page)).toHaveValue('');
      expect(page.url()).not.toContain('password');
    }
  } finally {
    await deleteAccount(email);
  }
});

test('the password can be shown, and has what a password manager looks for', async ({ page }) => {
  await page.goto('/ko/login');
  const box = passwordBox(page);
  await expect(box).toHaveAttribute('type', 'password');
  await expect(box).toHaveAttribute('autocomplete', 'current-password');
  await page.getByRole('button', { name: '비밀번호 보기' }).click();
  await expect(box).toHaveAttribute('type', 'text');
  await expectAccessible(page);
  await page.goto('/ko/signup');
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
  await page.goto('/ko/forgot-password');
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);
});

test('signing up confirms the address once, then the password works from then on', async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const email = uniqueEmail('signup', testInfo);
  try {
    await page.goto('/ko/signup?next=%2Fko%2Fabout');
    await signUpForm(page, email);
    await expect(
      page.getByRole('heading', { level: 1, name: '메일함을 확인해 주세요' }),
    ).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByRole('button', { name: /링크 다시 받기/ })).toBeDisabled();
    await expectAccessible(page);

    const link = new URL(await latestLinkFor(email));
    expect(link.origin).toBe(baseURL);
    expect(link.pathname).toBe('/ko/auth/confirm');
    expect(link.searchParams.get('next')).toBe('/ko/about');
    expect(link.searchParams.get('type')).toBe('signup');
    await page.goto(link.toString());
    await expect(page).toHaveURL(/\/ko\/reset-password\?next=%2Fko%2Fabout&first=1$/);
    await expect(page.getByRole('heading', { level: 1, name: '비밀번호 정하기' })).toBeVisible();
    await expectAccessible(page);

    // The rule is checked here now, before anything is saved.
    for (const weak of ['short1', 'onlyletters']) {
      await passwordBox(page).fill(weak);
      await page.getByRole('button', { name: '비밀번호 저장' }).click();
      await expect(page.getByRole('main').getByRole('alert')).toContainText('8자 이상');
    }
    await passwordBox(page).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: '비밀번호 저장' }).click();
    await expect(page).toHaveURL(/\/ko\/welcome\?next=%2Fko%2Fabout$/);

    // Later, somewhere else: no mail, only the password.
    await context.clearCookies();
    await page.goto('/ko/login');
    await page.getByLabel('이메일').fill(email);
    await passwordBox(page).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await expect(page).toHaveURL(/\/ko\/welcome/);
  } finally {
    await deleteAccount(email);
  }
});

test('signing up with an address that has an account looks the same and sends a sign-in link', async ({
  page,
  baseURL,
}, testInfo) => {
  const email = uniqueEmail('taken', testInfo);
  await createOnboardedAccount(email);
  try {
    await clearMessagesFor(email);
    // Making the account above counted as a mail for Auth's one-a-second limit.
    await page.waitForTimeout(1_200);
    await page.goto('/ko/signup');
    await signUpForm(page, email);
    await expect(page.getByRole('heading', { name: '메일함을 확인해 주세요' })).toBeVisible();

    const link = new URL(await latestLinkFor(email));
    expect(link.searchParams.get('type')).toBe('email');
    await page.goto(link.toString());
    await expect(page).toHaveURL(`${baseURL}/ko`);
  } finally {
    await deleteAccount(email);
  }
});

test('the waiting tab moves on by itself once the link was opened in another tab', async ({
  page,
  context,
}, testInfo) => {
  const email = uniqueEmail('waiting', testInfo);
  try {
    await page.goto('/ko/signup?next=%2Fko%2Fabout');
    await signUpForm(page, email);
    await expect(page.getByRole('heading', { name: '메일함을 확인해 주세요' })).toBeVisible();

    const mailTab = await context.newPage();
    await mailTab.goto(await latestLinkFor(email));
    await expect(mailTab).toHaveURL(/\/ko\/reset-password/);
    await mailTab.close();

    await expect(page).toHaveURL(/\/ko\/reset-password\?first=1&next=%2Fko%2Fabout$/);
  } finally {
    await deleteAccount(email);
  }
});

test('the waiting screen stays put for a session this browser already had', async ({
  page,
  baseURL,
}, testInfo) => {
  const signedIn = uniqueEmail('had', testInfo);
  const other = uniqueEmail('other', testInfo);
  await createPasswordAccount(signedIn);
  try {
    await page.goto(await requestSignInLink(signedIn, baseURL!));
    await expect(page).toHaveURL(/\/ko\/welcome/);
    await page.goto('/ko/signup');
    await signUpForm(page, other);

    const heading = page.getByRole('heading', { name: '메일함을 확인해 주세요' });
    await expect(heading).toBeVisible();
    await page.waitForTimeout(3_000);
    await expect(heading).toBeVisible();
  } finally {
    await deleteAccount(signedIn);
    await deleteAccount(other);
  }
});

test('the English sign-up sends the visitor back to the English page', async ({
  page,
}, testInfo) => {
  const email = uniqueEmail('english', testInfo);
  try {
    await page.goto('/en/signup?next=%2Fen%2Fabout');
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Check your inbox' })).toBeVisible();

    const link = new URL(await latestLinkFor(email));
    expect(link.pathname).toBe('/en/auth/confirm');
    await page.goto(link.toString());
    await expect(page).toHaveURL(/\/en\/reset-password\?next=%2Fen%2Fabout&first=1$/);
  } finally {
    await deleteAccount(email);
  }
});

test('a next that leaves the site or the language is not carried into the link', async ({
  page,
}, testInfo) => {
  const email = uniqueEmail('next', testInfo);
  try {
    await page.goto('/ko/signup?next=https%3A%2F%2Fevil.example%2Fko');
    await signUpForm(page, email);
    await expect(page.getByRole('heading', { name: '메일함을 확인해 주세요' })).toBeVisible();
    expect(new URL(await latestLinkFor(email)).searchParams.get('next')).toBe('/ko');
  } finally {
    await deleteAccount(email);
  }
});

test.describe('a forgotten password', () => {
  test('is reset through the mail: the old one stops working and other devices are signed out', async ({
    page,
  }, testInfo) => {
    const email = uniqueEmail('reset', testInfo);
    const newPassword = 'a-brand-new-pass-2';
    await createPasswordAccount(email);
    // Another device, signed in before the reset.
    const elsewhere = anonymousClient();
    try {
      const before = await elsewhere.auth.signInWithPassword({
        email,
        password: TEST_PASSWORD,
      });
      expect(before.error).toBeNull();

      await page.goto('/ko/login');
      await page.getByRole('link', { name: '비밀번호를 잊었어요' }).click();
      await expect(page).toHaveURL(/\/ko\/forgot-password$/);
      await page.getByLabel('이메일').fill(email);
      await page.getByRole('button', { name: '재설정 링크 받기' }).click();
      await expect(page.getByRole('heading', { name: '메일함을 확인해 주세요' })).toBeVisible();

      // Asking changes nothing: the old password still works until the link is used.
      const link = new URL(await latestLinkFor(email));
      expect(link.pathname).toBe('/ko/auth/confirm');
      expect(link.searchParams.get('type')).toBe('recovery');
      expect((await anonymousSignIn(email, TEST_PASSWORD)).error).toBeNull();

      await page.goto(link.toString());
      await expect(page).toHaveURL(/\/ko\/reset-password/);
      await expectAccessible(page);

      await passwordBox(page, '새 비밀번호').fill('short1');
      await page.getByRole('button', { name: '비밀번호 저장' }).click();
      await expect(page.getByRole('main').getByRole('alert')).toContainText('8자 이상');

      await passwordBox(page, '새 비밀번호').fill(newPassword);
      await page.getByRole('button', { name: '비밀번호 저장' }).click();
      await expect(page.getByRole('heading', { name: '비밀번호를 바꿨어요' })).toBeVisible();

      expect((await anonymousSignIn(email, TEST_PASSWORD)).error).not.toBeNull();
      expect((await anonymousSignIn(email, newPassword)).error).toBeNull();

      await page.getByRole('link', { name: '계속하기' }).click();
      await expect(page).toHaveURL(/\/ko\/welcome/);

      // The other device's session cannot be renewed any more.
      expect((await elsewhere.auth.refreshSession()).error).not.toBeNull();
    } finally {
      await deleteAccount(email);
    }
  });

  test('an address with no account gets the same answer and no mail', async ({
    page,
  }, testInfo) => {
    const email = uniqueEmail('nobody', testInfo);
    await page.goto('/ko/forgot-password');
    await page.getByLabel('이메일').fill(email);
    await page.getByRole('button', { name: '재설정 링크 받기' }).click();
    await expect(page.getByRole('heading', { name: '메일함을 확인해 주세요' })).toBeVisible();
    await page.waitForTimeout(1_000);
    expect(await latestLinkForNow(email)).toBeNull();
  });

  test('a reset link can be used only once', async ({ page, context, baseURL }, testInfo) => {
    const email = uniqueEmail('once', testInfo);
    await createPasswordAccount(email);
    try {
      await page.goto('/ko/forgot-password');
      await page.getByLabel('이메일').fill(email);
      await page.getByRole('button', { name: '재설정 링크 받기' }).click();
      await expect(page.getByRole('heading', { name: '메일함을 확인해 주세요' })).toBeVisible();
      const link = await latestLinkFor(email);
      await page.goto(link);
      await expect(page).toHaveURL(/\/ko\/reset-password/);
      await context.clearCookies();
      await page.goto(link);
      await expect(page).toHaveURL(`${baseURL}/ko/login?error=link`);
    } finally {
      await deleteAccount(email);
    }
  });

  test('the new-password screen is closed without a session', async ({ page, baseURL }) => {
    await page.goto('/ko/reset-password');
    await expect(page).toHaveURL(`${baseURL}/ko/login?error=link`);
  });

  test('the resend button works once a minute has passed, and the address can be changed', async ({
    page,
  }, testInfo) => {
    const email = uniqueEmail('resend', testInfo);
    await createPasswordAccount(email);
    try {
      await page.clock.install();
      await page.goto('/ko/forgot-password');
      await page.getByLabel('이메일').fill(email);
      await page.getByRole('button', { name: '재설정 링크 받기' }).click();
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

      // DESIGN.md's Outline pill: a 50% white border (0.5, not 0.25).
      await expect(resend).toHaveCSS('border-top-color', /\/ 0\.5\)$|, 0\.5\)$/);
      // The text button is as tall as a finger, and still centred under the pill.
      const change = page.getByRole('button', { name: '다른 이메일로 받기' });
      const changeBox = (await change.boundingBox())!;
      const resendBox = (await resend.boundingBox())!;
      expect(changeBox.height).toBeGreaterThanOrEqual(44);
      const centre = (box: { x: number; width: number }) => box.x + box.width / 2;
      expect(Math.abs(centre(changeBox) - centre(resendBox))).toBeLessThan(1.5);
      await expectNoHorizontalScroll(page);

      await change.click();
      await expect(page.getByRole('heading', { level: 1, name: '비밀번호 찾기' })).toBeVisible();
      await expect(page.getByLabel('이메일')).toHaveValue(email);
    } finally {
      await deleteAccount(email);
    }
  });

  test('My page changes the password the same way, with the address filled in', async ({
    page,
    baseURL,
  }) => {
    await signIn(page, 'member@example.test', baseURL!);
    await page.goto('/ko/me');
    await page.getByRole('link', { name: '비밀번호 변경' }).click();
    await expect(page).toHaveURL(/\/ko\/forgot-password$/);
    await expect(page.getByLabel('이메일')).toHaveValue('member@example.test');
  });
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

test('a Google sign-in that Auth refuses because the account is blocked says so', async ({
  request,
  baseURL,
}) => {
  // What Supabase Auth sends back to the callback for a banned account: no code, and the reason.
  const response = await request.get(
    '/en/auth/callback?next=%2Fen%2Fabout&error=access_denied&error_code=user_banned&error_description=User+is+banned',
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(307);
  const location = new URL(response.headers()['location'], baseURL!);
  expect(location.pathname + location.search).toBe('/en/login?error=blocked');
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
    await expect(header.getByRole('link', { name: '회원 관리', exact: true })).toHaveCount(0);
    await expect(header.getByRole('link', { name: '팀 관리', exact: true })).toHaveCount(0);

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
      page.locator('header').getByRole('link', { name: '회원 관리', exact: true }),
    ).toBeVisible();
    const teams = page.locator('header').getByRole('link', { name: '팀 관리', exact: true });
    await expect(teams).toHaveAttribute('href', '/ko/admin/teams');
    await teams.click();
    await expect(page).toHaveURL(`${baseURL}/ko/admin/teams`);
    await expect(page.getByRole('heading', { level: 1, name: '팀 관리' })).toBeVisible();
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
  test('is told so when it signs in with its password', async ({ page }, testInfo) => {
    const email = uniqueEmail('banned', testInfo);
    const id = await createPasswordAccount(email);
    try {
      const { error } = await adminClient().auth.admin.updateUserById(id, {
        ban_duration: '24h',
      });
      expect(error).toBeNull();
      await page.goto('/ko/login');
      await page.getByLabel('이메일').fill(email);
      await passwordBox(page).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: '로그인', exact: true }).click();
      await expect(notice(page)).toHaveText(COPY.ko.errors.blocked);
    } finally {
      await deleteAccount(email);
    }
  });

  test('is shown as signed out, with the reason', async ({ page, baseURL }, testInfo) => {
    const email = `blocked-${testInfo.project.name}-${Date.now()}@example.test`;
    try {
      await createBlockedAccount(email);
      // The link is opened without running the page it ends on (which, for a blocked account that
      // has not signed up, is the login page: it ends the session it finds). That leaves the
      // session in the browser, which is what this test is about.
      await page.request.get(await requestSignInLink(email, baseURL!));

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
