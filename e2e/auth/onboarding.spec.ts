import { existsSync } from 'node:fs';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { PRIVACY_POLICY_VERSION } from '@/lib/auth/profile';
import { expectAccessible, expectNoHorizontalScroll } from '../helpers';
import {
  accountRows,
  authCookies,
  createBlockedAccount,
  deleteAccount,
  requestSignInLink,
  signIn,
} from './helpers';

// Every run signs up a brand-new address (a fake one, deleted afterwards).
let counter = 0;
function newAddress(testInfo: TestInfo): string {
  return `new-${testInfo.project.name}-${Date.now()}-${counter++}@example.test`;
}

// Opens the emailed link of a new account: it lands on the welcome form, carrying where the
// visitor was heading.
async function startSignUp(
  page: Page,
  email: string,
  baseURL: string,
  { locale = 'ko', next = `/${locale}` }: { locale?: 'ko' | 'en'; next?: string } = {},
) {
  await page.goto(await requestSignInLink(email, baseURL, { locale, next }));
  await expect(page).toHaveURL(`${baseURL}/${locale}/welcome?next=${encodeURIComponent(next)}`);
  await page.waitForLoadState('networkidle');
}

// The page's own message (Next also keeps an empty alert in the page for route announcements).
function summary(page: Page) {
  return page.locator('main').getByRole('alert');
}

// Phones keep the account entries inside the menu panel; on a desktop they sit in the bar.
async function openMenu(page: Page) {
  const summaryButton = page.locator('header summary');
  if (await summaryButton.isVisible()) await summaryButton.click();
}

function initialCircle(page: Page) {
  return page.locator('header [data-account-initial]:visible');
}

const COPY = {
  ko: {
    title: '반가워요!',
    lead: '가입을 마치려면 몇 가지만 알려주세요',
    emailLabel: '이메일',
    emailNote: '(로그인 계정)',
    lastName: '성',
    firstName: '이름',
    occupations: ['대학생', '대학원생', '졸업생·직장인', '창업자', '기타'],
    occupationLegend: '지금 하고 있는 일',
    school: '학교',
    major: '전공',
    affiliation: '소속 (선택)',
    age14: '[필수] 만 14세 이상이에요',
    privacy: '[필수] 개인정보 수집·이용에 동의해요',
    privacyLink: /내용 보기/,
    recruit: '[선택] 모집 소식을 이메일로 받을래요',
    submit: '가입 완료',
    lastNameMissing: '성을 입력해 주세요.',
    majorMissing: '전공을 입력해 주세요.',
    age14Missing: '만 14세 이상이어야 가입할 수 있어요.',
    count: (n: number) => `확인이 필요한 항목이 ${n}개 있어요.`,
  },
  en: {
    title: 'Welcome!',
    lead: 'Tell us a few things to finish signing up',
    emailLabel: 'Email',
    emailNote: '(your sign-in account)',
    lastName: 'Last name',
    firstName: 'First name',
    occupations: ['Undergraduate', 'Graduate student', 'Alumni or working', 'Founder', 'Other'],
    occupationLegend: 'What you do now',
    school: 'School',
    major: 'Major',
    affiliation: 'Affiliation (optional)',
    age14: '[Required] I am 14 or older',
    privacy: '[Required] I agree to the collection and use of my personal information',
    privacyLink: /read/i,
    recruit: '[Optional] Email me about recruitment',
    submit: 'Finish sign-up',
    lastNameMissing: 'Enter your last name.',
    majorMissing: 'Enter your major.',
    age14Missing: 'You need to be 14 or older to sign up.',
    count: (n: number) => `${n} ${n === 1 ? 'item needs' : 'items need'} a look.`,
  },
} as const;

for (const locale of ['ko', 'en'] as const) {
  const t = COPY[locale];

  test.describe(`/${locale}/welcome`, () => {
    test('shows the sign-up form to an account that has not finished signing up', async ({
      page,
      baseURL,
    }, testInfo) => {
      const email = newAddress(testInfo);
      try {
        const response = await requestSignInLink(email, baseURL!, { locale });
        await page.goto(response);
        await expect(page).toHaveURL(`${baseURL}/${locale}/welcome?next=%2F${locale}`);
        await expect(page.getByRole('heading', { level: 1, name: t.title })).toBeVisible();
        await expect(page.getByText(t.lead)).toBeVisible();
        // The address is the account's, shown but not asked for.
        // (The phone's menu panel also names the account, so the form's own copy is picked.)
        await expect(page.locator('main').getByText(email)).toBeVisible();
        await expect(page.getByText(t.emailNote)).toBeVisible();
        await expect(
          page.locator('main input[type="email"], main input[name="email"]'),
        ).toHaveCount(0);

        await expect(page.getByLabel(t.lastName, { exact: true })).toBeVisible();
        await expect(page.getByLabel(t.firstName, { exact: true })).toBeVisible();
        const group = page.getByRole('radiogroup', { name: t.occupationLegend });
        await expect(group.getByRole('radio')).toHaveCount(5);
        for (const name of t.occupations) {
          await expect(group.getByRole('radio', { name })).not.toBeChecked();
        }
        await expect(page.getByRole('checkbox', { name: t.age14 })).not.toBeChecked();
        await expect(page.getByRole('checkbox', { name: t.privacy })).not.toBeChecked();
        await expect(page.getByRole('checkbox', { name: t.recruit })).not.toBeChecked();
        await expect(page.getByRole('button', { name: t.submit })).toBeEnabled();

        // The policy opens in a new tab, so nothing typed here is lost.
        const link = page.getByRole('link', { name: t.privacyLink });
        await expect(link).toHaveAttribute('href', `/${locale}/privacy`);
        await expect(link).toHaveAttribute('target', '_blank');

        // Account screens stay out of search results.
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      } finally {
        await deleteAccount(email);
      }
    });

    test('shows school and major to students, and an affiliation to everyone else', async ({
      page,
      baseURL,
    }, testInfo) => {
      const email = newAddress(testInfo);
      try {
        // The pills ease their colours for a moment; a check during that moment would measure a
        // colour on its way.
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await startSignUp(page, email, baseURL!, { locale });
        const school = page.getByLabel(t.school, { exact: true });
        const major = page.getByLabel(t.major, { exact: true });
        const affiliation = page.getByLabel(t.affiliation, { exact: true });

        // Until a choice is made, none of the three is asked for.
        await expect(school).toBeHidden();
        await expect(major).toBeHidden();
        await expect(affiliation).toBeHidden();

        for (const name of [t.occupations[0], t.occupations[1]]) {
          await page.getByRole('radio', { name }).check();
          await expect(school).toBeVisible();
          await expect(major).toBeVisible();
          await expect(affiliation).toBeHidden();
        }
        await expectNoHorizontalScroll(page);
        await expectAccessible(page);

        for (const name of [t.occupations[2], t.occupations[3], t.occupations[4]]) {
          await page.getByRole('radio', { name }).check();
          await expect(school).toBeHidden();
          await expect(major).toBeHidden();
          await expect(affiliation).toBeVisible();
        }
        await expectNoHorizontalScroll(page);
        await expectAccessible(page);
      } finally {
        await deleteAccount(email);
      }
    });

    test('is operable with the keyboard alone', async ({ page, baseURL }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'keyboard order is the same on a phone');
      const email = newAddress(testInfo);
      try {
        await startSignUp(page, email, baseURL!, { locale });
        const group = page.getByRole('radiogroup', { name: t.occupationLegend });
        const first = group.getByRole('radio').first();

        // Tab reaches the group once, and the arrow keys choose within it. (The name that comes
        // last is the given name in Korean and the family name in English.)
        await page.getByLabel(locale === 'ko' ? t.firstName : t.lastName, { exact: true }).focus();
        await page.keyboard.press('Tab');
        await expect(first).toBeFocused();
        await page.keyboard.press('ArrowRight');
        await expect(group.getByRole('radio', { name: t.occupations[1] })).toBeChecked();
        await page.keyboard.press('ArrowRight');
        await expect(group.getByRole('radio', { name: t.occupations[2] })).toBeChecked();

        // The checkboxes toggle with Space.
        const age = page.getByRole('checkbox', { name: t.age14 });
        await age.focus();
        await page.keyboard.press('Space');
        await expect(age).toBeChecked();
      } finally {
        await deleteAccount(email);
      }
    });
  });
}

test('asks for what is missing, keeps what was typed, and finishes once it is all there', async ({
  page,
  baseURL,
}, testInfo) => {
  const t = COPY.ko;
  const email = newAddress(testInfo);
  try {
    await startSignUp(page, email, baseURL!);
    // A mark that a full page load would wipe: the sign-up must finish without one, so that the
    // header (which keeps its state across soft navigations) is told the account changed.
    await page.evaluate(() => {
      (window as unknown as { softNav: boolean }).softNav = true;
    });

    // Nothing is filled in: every required answer is named, and focus goes to the first.
    await page.getByRole('button', { name: t.submit }).click();
    await expect(summary(page)).toHaveText(t.count(5));
    await expect(page.getByText(t.lastNameMissing)).toBeVisible();
    await expect(page.getByLabel(t.lastName, { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(page.getByLabel(t.lastName, { exact: true })).toBeFocused();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);
    let rows = await accountRows(email);
    expect(rows.profile.onboarded_at).toBeNull();
    expect(rows.consents).toEqual([]);

    // A graduate student without a major, and the age box not ticked.
    await page.getByLabel(t.lastName, { exact: true }).fill('박');
    await page.getByLabel(t.firstName, { exact: true }).fill('새롬');
    await page.getByRole('radio', { name: '대학원생' }).check();
    await page.getByLabel(t.school, { exact: true }).fill('성균관대학교');
    await page.getByRole('checkbox', { name: t.privacy }).check();
    await page.getByRole('button', { name: t.submit }).click();

    await expect(summary(page)).toHaveText(t.count(2));
    await expect(page.getByText(t.majorMissing)).toBeVisible();
    await expect(page.getByText(t.age14Missing)).toBeVisible();
    await expect(page.getByLabel(t.major, { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel(t.major, { exact: true })).toBeFocused();
    await expect(page.getByRole('checkbox', { name: t.age14 })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    // What was typed and chosen is still there.
    await expect(page.getByLabel(t.lastName, { exact: true })).toHaveValue('박');
    await expect(page.getByLabel(t.firstName, { exact: true })).toHaveValue('새롬');
    await expect(page.getByRole('radio', { name: '대학원생' })).toBeChecked();
    await expect(page.getByLabel(t.school, { exact: true })).toHaveValue('성균관대학교');
    await expect(page.getByRole('checkbox', { name: t.privacy })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: t.age14 })).not.toBeChecked();
    await expectAccessible(page);
    await expectNoHorizontalScroll(page);

    // Touching a field takes its message away.
    await page.getByLabel(t.major, { exact: true }).fill('데이터사이언스');
    await expect(page.getByText(t.majorMissing)).toHaveCount(0);
    await expect(page.getByLabel(t.major, { exact: true })).not.toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await page.getByRole('checkbox', { name: t.age14 }).check();
    await expect(page.getByText(t.age14Missing)).toHaveCount(0);

    // Still nothing is saved while the form is not done.
    rows = await accountRows(email);
    expect(rows.profile.onboarded_at).toBeNull();
    expect(rows.consents).toEqual([]);

    // Done: back to the home page, the header's circle shows the new initial, no page reload.
    await page.getByRole('button', { name: t.submit }).click();
    await expect(page).toHaveURL(`${baseURL}/ko`);
    expect(await page.evaluate(() => (window as unknown as { softNav?: boolean }).softNav)).toBe(
      true,
    );
    await openMenu(page);
    await expect(initialCircle(page)).toHaveText('박');

    rows = await accountRows(email);
    expect(rows.profile).toMatchObject({
      email,
      last_name: '박',
      first_name: '새롬',
      occupation: 'grad',
      school: '성균관대학교',
      major: '데이터사이언스',
      affiliation: null,
      recruit_opt_in: false,
    });
    expect(rows.profile.onboarded_at).not.toBeNull();
    // The consents were recorded with the policy version, the optional one as "no".
    expect(
      Object.fromEntries(rows.consents.map((c) => [c.kind, [c.granted, c.policy_version]])),
    ).toEqual({
      privacy: [true, PRIVACY_POLICY_VERSION],
      age14: [true, PRIVACY_POLICY_VERSION],
      recruit: [false, PRIVACY_POLICY_VERSION],
    });
    expect(rows.consents).toHaveLength(3);

    // Signing in again goes straight on: the form is not shown a second time.
    await page.goto(await requestSignInLink(email, baseURL!, { next: '/ko/about' }));
    await expect(page).toHaveURL(`${baseURL}/ko/about`);
    await page.goto('/ko/welcome');
    await expect(page).toHaveURL(`${baseURL}/ko`);
    await page.goto('/en/welcome?next=%2Fen%2Fabout');
    await expect(page).toHaveURL(`${baseURL}/en/about`);
  } finally {
    await deleteAccount(email);
  }
});

test('an alumnus signs up in English, with an affiliation and the recruitment mail', async ({
  page,
  baseURL,
}, testInfo) => {
  const t = COPY.en;
  const email = newAddress(testInfo);
  try {
    await startSignUp(page, email, baseURL!, { locale: 'en', next: '/en/about' });

    await page.getByLabel(t.firstName, { exact: true }).fill('Rise');
    await page.getByLabel(t.lastName, { exact: true }).fill('Kim');
    await page.getByRole('radio', { name: 'Alumni or working' }).check();
    await page.getByLabel(t.affiliation, { exact: true }).fill('Rise Labs');
    await page.getByRole('checkbox', { name: t.age14 }).check();
    await page.getByRole('checkbox', { name: t.privacy }).check();
    await page.getByRole('checkbox', { name: t.recruit }).check();
    await page.getByRole('button', { name: t.submit }).click();

    // Back to the page the visitor was heading for.
    await expect(page).toHaveURL(`${baseURL}/en/about`);
    await openMenu(page);
    await expect(initialCircle(page)).toHaveText('R');

    const rows = await accountRows(email);
    expect(rows.profile).toMatchObject({
      last_name: 'Kim',
      first_name: 'Rise',
      occupation: 'alumni',
      school: null,
      major: null,
      affiliation: 'Rise Labs',
      recruit_opt_in: true,
    });
    expect(rows.consents.find((c) => c.kind === 'recruit')).toMatchObject({
      granted: true,
      policy_version: PRIVACY_POLICY_VERSION,
    });
  } finally {
    await deleteAccount(email);
  }
});

test('a school typed before choosing another occupation is not saved', async ({
  page,
  baseURL,
}, testInfo) => {
  const t = COPY.ko;
  const email = newAddress(testInfo);
  try {
    await startSignUp(page, email, baseURL!);
    await page.getByLabel(t.lastName, { exact: true }).fill('최');
    await page.getByLabel(t.firstName, { exact: true }).fill('하늘');
    await page.getByRole('radio', { name: '대학생' }).check();
    await page.getByLabel(t.school, { exact: true }).fill('성균관대학교');
    await page.getByLabel(t.major, { exact: true }).fill('경영학');
    await page.getByRole('radio', { name: '창업자' }).check();
    await page.getByRole('checkbox', { name: t.age14 }).check();
    await page.getByRole('checkbox', { name: t.privacy }).check();
    await page.getByRole('button', { name: t.submit }).click();
    await expect(page).toHaveURL(`${baseURL}/ko`);

    const { profile } = await accountRows(email);
    expect(profile).toMatchObject({ occupation: 'founder', school: null, major: null });
  } finally {
    await deleteAccount(email);
  }
});

test.describe('before the page has loaded its scripts', () => {
  // The form is a plain form post: it works for a browser that never runs the page's JavaScript.
  // (Without motion the page jumps instead of gliding when Playwright scrolls a field into view;
  // a glide that has not finished makes it call the field "not stable" on a phone.)
  test.use({ javaScriptEnabled: false, reducedMotion: 'reduce' });

  test('a complete form still signs the account up', async ({ page, baseURL }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    try {
      await startSignUp(page, email, baseURL!);
      await page.getByLabel(t.lastName, { exact: true }).fill('정');
      await page.getByLabel(t.firstName, { exact: true }).fill('은우');
      // The fields that go with the choice appear without any script.
      await page.getByRole('radio', { name: '대학생' }).check();
      await page.getByLabel(t.school, { exact: true }).fill('성균관대학교');
      await page.getByLabel(t.major, { exact: true }).fill('화학공학');
      await page.getByRole('checkbox', { name: t.age14 }).check();
      await page.getByRole('checkbox', { name: t.privacy }).check();
      await page.getByRole('button', { name: t.submit }).click();

      await expect(page).toHaveURL(`${baseURL}/ko`);
      const { profile, consents } = await accountRows(email);
      expect(profile).toMatchObject({
        last_name: '정',
        occupation: 'undergrad',
        major: '화학공학',
      });
      expect(profile.onboarded_at).not.toBeNull();
      expect(consents).toHaveLength(3);
    } finally {
      await deleteAccount(email);
    }
  });

  test('an incomplete form comes back with its messages and what was typed', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    try {
      await startSignUp(page, email, baseURL!);
      await page.getByLabel(t.lastName, { exact: true }).fill('정');
      await page.getByRole('radio', { name: '대학원생' }).check();
      await page.getByLabel(t.school, { exact: true }).fill('성균관대학교');
      await page.getByRole('button', { name: t.submit }).click();

      await expect(page).toHaveURL(/\/ko\/welcome/);
      await expect(summary(page)).toHaveText(t.count(4));
      await expect(page.getByLabel(t.lastName, { exact: true })).toHaveValue('정');
      await expect(page.getByRole('radio', { name: '대학원생' })).toBeChecked();
      await expect(page.getByLabel(t.school, { exact: true })).toHaveValue('성균관대학교');
      await expect(page.getByText(t.majorMissing)).toBeVisible();
      expect((await accountRows(email)).profile.onboarded_at).toBeNull();
    } finally {
      await deleteAccount(email);
    }
  });
});

test.describe('who gets the form', () => {
  test('a visitor who is signed out is sent to sign in first', async ({ page, baseURL }) => {
    await page.goto('/ko/welcome?next=%2Fko%2Fabout');
    await expect(page).toHaveURL(`${baseURL}/ko/login?next=%2Fko%2Fabout`);
    await page.goto('/en/welcome');
    await expect(page).toHaveURL(`${baseURL}/en/login`);
  });

  test('an account that has finished signing up is sent on instead', async ({ page, baseURL }) => {
    await signIn(page, 'member@example.test', baseURL!);
    await page.goto('/ko/welcome?next=%2Fko%2Fabout');
    await expect(page).toHaveURL(`${baseURL}/ko/about`);
    // A next that leaves the site, or points back at the form, ends at the home page.
    await page.goto('/ko/welcome?next=https%3A%2F%2Fevil.example%2Fko');
    await expect(page).toHaveURL(`${baseURL}/ko`);
    await page.goto('/ko/welcome?next=%2Fko%2Fwelcome');
    await expect(page).toHaveURL(`${baseURL}/ko`);
  });

  test('a blocked account is shown the reason instead', async ({ request, baseURL }, testInfo) => {
    const email = newAddress(testInfo);
    try {
      await createBlockedAccount(email);
      // Plain requests, so that the login page it lands on does not get to end the session in a
      // browser (it does that for a blocked account); the session is what the form must refuse.
      await request.get(await requestSignInLink(email, baseURL!));
      const response = await request.get('/ko/welcome', { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      expect(new URL(response.headers()['location'], baseURL!).pathname).toBe('/ko/login');
      expect(new URL(response.headers()['location'], baseURL!).search).toBe('?error=blocked');
    } finally {
      await deleteAccount(email);
    }
  });

  test('a blocked account that opens its sign-in link is told why, and its session is ended', async ({
    page,
    baseURL,
  }, testInfo) => {
    const email = newAddress(testInfo);
    try {
      await createBlockedAccount(email);
      // The link would send an account that has not signed up to the form; a blocked one is turned
      // away there, to the login page, which shows the reason and ends the browser's session.
      await page.goto(await requestSignInLink(email, baseURL!));
      await expect(page).toHaveURL(`${baseURL}/ko/login?error=blocked`);
      await expect(summary(page)).toHaveText('이용이 제한된 계정이에요.');
      await expect.poll(async () => authCookies(await page.context().cookies())).toEqual([]);
    } finally {
      await deleteAccount(email);
    }
  });

  // The pages below arrive in later tasks; each of these switches itself on when its page exists.
  for (const [name, path, file] of [
    ['my page', '/ko/me', 'src/app/[locale]/me/page.tsx'],
    ['the members screen', '/ko/admin/members', 'src/app/[locale]/admin/members/page.tsx'],
  ] as const) {
    test(`an account that has not finished signing up is sent back to the form from ${name}`, async ({
      page,
      baseURL,
    }, testInfo) => {
      test.skip(!existsSync(file), `${name} does not exist yet`);
      const email = newAddress(testInfo);
      try {
        await startSignUp(page, email, baseURL!);
        await page.goto(path);
        await expect(page).toHaveURL(`${baseURL}/ko/welcome?next=${encodeURIComponent(path)}`);
      } finally {
        await deleteAccount(email);
      }
    });
  }
});
