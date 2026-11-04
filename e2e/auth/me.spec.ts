import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { PRIVACY_POLICY_VERSION } from '@/lib/auth/profile';
import { expectAccessible, expectNoHorizontalScroll } from '../helpers';
import {
  accountRows,
  adminClient,
  authCookies,
  createBlockedAccount,
  deleteAccount,
  requestSignInLink,
  signIn,
} from './helpers';

type Locale = 'ko' | 'en';

// Every run signs up brand-new addresses (fake ones, deleted afterwards).
let counter = 0;
function newAddress(testInfo: TestInfo): string {
  return `me-${testInfo.project.name}-${Date.now()}-${counter++}@example.test`;
}

const COPY = {
  ko: {
    title: '마이페이지',
    roles: { guest: '가입자', member: '회원', operator: '운영진', admin: '관리자' },
    edit: '정보 수정',
    editTitle: '정보 수정',
    save: '저장',
    cancel: '취소',
    signOut: '로그아웃',
    rows: {
      occupation: '지금 하고 있는 일',
      school: '학교',
      major: '전공',
      affiliation: '소속',
      recruit: '모집 소식 이메일',
      recruitOn: '받아요',
      recruitOff: '받지 않아요',
    },
    remove: {
      summary: '회원 탈퇴',
      heading: '정말 탈퇴할까요?',
      word: '탈퇴',
      prompt: /계속하려면/,
      submit: '탈퇴하기',
      wrong: '탈퇴를 정확히 입력해 주세요.',
    },
    notice: '탈퇴가 완료됐어요. 함께해 주셔서 고마웠어요.',
    signIn: '로그인',
    // The sign-up form (see onboarding.spec.ts).
    signUp: {
      lastName: '성',
      firstName: '이름',
      names: ['박', '새롬'],
      undergrad: '대학생',
      founder: '창업자',
      school: '학교',
      major: '전공',
      affiliation: '소속 (선택)',
      age14: '[필수] 만 14세 이상이에요',
      privacy: '[필수] 개인정보 수집·이용에 동의해요',
      recruit: '[선택] 모집 소식을 이메일로 받을래요',
      submit: '가입 완료',
    },
  },
  en: {
    title: 'My page',
    roles: { guest: 'Guest', member: 'Member', operator: 'Operator', admin: 'Admin' },
    edit: 'Edit',
    editTitle: 'Edit your info',
    save: 'Save',
    cancel: 'Cancel',
    signOut: 'Sign out',
    rows: {
      occupation: 'What you do now',
      school: 'School',
      major: 'Major',
      affiliation: 'Affiliation',
      recruit: 'Recruitment emails',
      recruitOn: 'Subscribed',
      recruitOff: 'Not subscribed',
    },
    remove: {
      summary: 'Delete account',
      heading: 'Delete your account?',
      word: 'delete',
      prompt: /To continue/,
      submit: 'Delete my account',
      wrong: 'Type delete exactly as shown.',
    },
    notice: 'Your account has been deleted. Thanks for being part of RISE CREW.',
    signIn: 'Sign in',
    signUp: {
      lastName: 'Last name',
      firstName: 'First name',
      names: ['Kim', 'Rise'],
      undergrad: 'Undergraduate',
      founder: 'Founder',
      school: 'School',
      major: 'Major',
      affiliation: 'Affiliation (optional)',
      age14: '[Required] I am 14 or older',
      privacy: '[Required] I agree to the collection and use of my personal information',
      recruit: '[Optional] Email me about recruitment',
      submit: 'Finish sign-up',
    },
  },
} as const;

// Phones keep the account entries inside the menu panel; on a desktop they sit in the bar.
async function openMenu(page: Page) {
  const summaryButton = page.locator('header summary');
  // (A menu that is already open stays open while the visitor moves within the same page.)
  const open = (await page.locator('header details[open]').count()) > 0;
  if ((await summaryButton.isVisible()) && !open) await summaryButton.click();
}

function initialCircle(page: Page) {
  return page.locator('header [data-account-initial]:visible');
}

// Waits until the page's scripts have taken over: React marks the elements it has hydrated. (The
// network going quiet is no use for this: Next's prefetches of the header links can stay open.)
async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const form = document.querySelector('main form');
    return form !== null && Object.keys(form).some((key) => key.startsWith('__reactProps$'));
  });
}

// The page's own message (Next also keeps an empty alert in the page for route announcements).
function alert(page: Page) {
  return page.locator('main').getByRole('alert');
}

// The "label above, value below" row of the profile.
function row(page: Page, label: string) {
  return page.locator('main dl > div').filter({ has: page.getByText(label, { exact: true }) });
}

function removeSummary(page: Page, locale: Locale) {
  return page.locator('main summary', { hasText: COPY[locale].remove.summary });
}

// Signs a brand-new account up through the real form and lands on My page, the way a visitor
// does. The account ends up with a name, a school and a major, and the three sign-up consents.
async function signUp(
  page: Page,
  email: string,
  baseURL: string,
  {
    locale = 'ko',
    recruit = false,
    major = '경영학',
    scripts = true,
  }: { locale?: Locale; recruit?: boolean; major?: string; scripts?: boolean } = {},
) {
  const t = COPY[locale].signUp;
  // With the page's scripts switched off there is nothing to wait for.
  const settle = (): Promise<void> => (scripts ? hydrated(page) : page.waitForLoadState('load'));
  const next = `/${locale}/me`;
  await page.goto(await requestSignInLink(email, baseURL, { locale, next }));
  await expect(page).toHaveURL(`${baseURL}/${locale}/welcome?next=${encodeURIComponent(next)}`);
  await settle();

  await page.getByLabel(t.lastName, { exact: true }).fill(t.names[0]);
  await page.getByLabel(t.firstName, { exact: true }).fill(t.names[1]);
  await page.getByRole('radio', { name: t.undergrad }).check();
  await page.getByLabel(t.school, { exact: true }).fill('성균관대학교');
  await page.getByLabel(t.major, { exact: true }).fill(major);
  await page.getByRole('checkbox', { name: t.age14 }).check();
  await page.getByRole('checkbox', { name: t.privacy }).check();
  if (recruit) await page.getByRole('checkbox', { name: t.recruit }).check();
  await page.getByRole('button', { name: t.submit }).click();

  await expect(page).toHaveURL(`${baseURL}/${locale}/me`);
  await settle();
}

// Sets a hidden field of the form the way someone with the developer tools open could.
async function tamper(page: Page, name: string, value: string) {
  await page.evaluate(
    ([field, to]) => {
      const input = document.querySelector<HTMLInputElement>(`main form input[name="${field}"]`);
      if (!input) throw new Error(`There is no field ${field}.`);
      input.value = to;
    },
    [name, value],
  );
}

// Clicks a button that runs a server action and waits for the action's answer to arrive (a page
// that is already showing the screen the action sends the visitor to gives no other sign).
async function clickAndWaitForAction(page: Page, button: Locator) {
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === 'POST'),
    button.click(),
  ]);
}

// Sends the delete form with `typed` in the field and waits for the refusal that comes back: a new
// alert (the one showing, if any, is marked first, so the two can be told apart) and the field
// showing what was typed. The field is only typed into once it has settled.
async function sendWrongWord(page: Page, locale: Locale, typed: string) {
  const t = COPY[locale].remove;
  const input = page.getByLabel(t.prompt);
  await page
    .locator('main [role="alert"]')
    .evaluateAll((alerts) => alerts.forEach((el) => el.setAttribute('data-seen', '')));
  await input.fill(typed);
  await page.getByRole('button', { name: t.submit }).click();
  await expect(page.locator('main [data-seen]')).toHaveCount(0);
  await expect(alert(page)).toHaveText(t.wrong);
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue(typed);
}

// What the database still holds for an account, found by its id.
async function leftovers(id: string) {
  const admin = adminClient();
  const user = await admin.auth.admin.getUserById(id);
  const [profile, role, consents] = await Promise.all([
    admin.from('profiles').select('id').eq('id', id),
    admin.from('user_roles').select('user_id').eq('user_id', id),
    admin.from('consents').select('id').eq('user_id', id),
  ]);
  return {
    authUser: user.data.user !== null,
    profiles: profile.data?.length ?? -1,
    roles: role.data?.length ?? -1,
    consents: consents.data?.length ?? -1,
  };
}

test.describe('who gets My page', () => {
  for (const locale of ['ko', 'en'] as const) {
    test(`a visitor who is signed out is sent to sign in first (${locale})`, async ({
      page,
      baseURL,
    }) => {
      await page.goto(`/${locale}/me`);
      await expect(page).toHaveURL(`${baseURL}/${locale}/login?next=%2F${locale}%2Fme`);
    });
  }

  test('an account that has not finished signing up goes to the form first', async ({
    page,
    baseURL,
  }, testInfo) => {
    const email = newAddress(testInfo);
    try {
      await page.goto(await requestSignInLink(email, baseURL!));
      await page.goto('/ko/me');
      await expect(page).toHaveURL(`${baseURL}/ko/welcome?next=%2Fko%2Fme`);
    } finally {
      await deleteAccount(email);
    }
  });

  test('a blocked account is shown the reason instead', async ({ request, baseURL }, testInfo) => {
    const email = newAddress(testInfo);
    try {
      await createBlockedAccount(email);
      await request.get(await requestSignInLink(email, baseURL!));
      const response = await request.get('/ko/me', { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      const location = new URL(response.headers()['location'], baseURL!);
      expect(location.pathname + location.search).toBe('/ko/login?error=blocked');
    } finally {
      await deleteAccount(email);
    }
  });
});

for (const locale of ['ko', 'en'] as const) {
  const t = COPY[locale];

  test.describe(`/${locale}/me`, () => {
    test('shows the signed-in guest their own data and their role', async ({ page, baseURL }) => {
      await signIn(page, 'guest@example.test', baseURL!);
      const response = await page.goto(`/${locale}/me`);
      expect(response?.status()).toBe(200);
      await hydrated(page);

      await expect(page.getByRole('heading', { level: 1, name: t.title })).toBeVisible();
      const main = page.locator('main');
      // The seeded guest is 김가입 (Korean order: family name first; English: given name first).
      await expect(
        main.getByText(locale === 'ko' ? '김가입' : '가입 김', { exact: true }),
      ).toBeVisible();
      await expect(main.getByText('guest@example.test', { exact: true })).toBeVisible();
      await expect(main.getByText(t.roles.guest, { exact: true })).toBeVisible();
      // The initial circle names nobody twice: it is decoration next to the name.
      await expect(main.locator('[data-profile-initial]')).toHaveText('김');

      await expect(row(page, t.rows.occupation)).toContainText(t.signUp.undergrad);
      await expect(row(page, t.rows.school)).toContainText('성균관대학교');
      await expect(row(page, t.rows.major)).toContainText('경영학');
      await expect(row(page, t.rows.affiliation)).toHaveCount(0);
      await expect(row(page, t.rows.recruit)).toContainText(t.rows.recruitOn);

      await expect(main.getByRole('link', { name: t.edit, exact: true })).toBeVisible();
      await expect(main.getByRole('button', { name: t.signOut, exact: true })).toBeVisible();
      // The delete step is folded away until it is asked for.
      await expect(removeSummary(page, locale)).toBeVisible();
      await expect(page.getByRole('button', { name: t.remove.submit })).toBeHidden();

      // Account screens stay out of search results.
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expectNoHorizontalScroll(page);
      await expectAccessible(page);
    });

    test('has an edit form that starts from what is saved, and leaves it alone when cancelled', async ({
      page,
      baseURL,
    }) => {
      await signIn(page, 'guest@example.test', baseURL!);
      await page.goto(`/${locale}/me`);
      await hydrated(page);

      await page.locator('main').getByRole('link', { name: t.edit, exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/${locale}/me?edit=1`);
      await expect(page.getByRole('heading', { level: 1, name: t.editTitle })).toBeVisible();
      // Same form as the sign-up, with what the account has already told us.
      await expect(page.getByLabel(t.signUp.lastName, { exact: true })).toHaveValue('김');
      await expect(page.getByLabel(t.signUp.firstName, { exact: true })).toHaveValue('가입');
      await expect(page.getByRole('radio', { name: t.signUp.undergrad })).toBeChecked();
      await expect(page.getByLabel(t.signUp.major, { exact: true })).toHaveValue('경영학');
      await expect(page.getByRole('checkbox', { name: t.signUp.recruit })).toBeChecked();
      // The two sign-up consents were given once; an edit does not ask again.
      await expect(page.getByRole('checkbox', { name: t.signUp.age14 })).toHaveCount(0);
      await expect(page.getByRole('checkbox', { name: t.signUp.privacy })).toHaveCount(0);
      await expect(page.getByRole('button', { name: t.save, exact: true })).toBeEnabled();
      // Nothing about deleting the account while editing.
      await expect(removeSummary(page, locale)).toHaveCount(0);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expectNoHorizontalScroll(page);
      await expectAccessible(page);

      await page.getByLabel(t.signUp.major, { exact: true }).fill('바꾸다 만 전공');
      await page.locator('main').getByRole('link', { name: t.cancel, exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/${locale}/me`);
      await expect(row(page, t.rows.major)).toContainText('경영학');
      expect((await accountRows('guest@example.test')).profile.major).toBe('경영학');
    });
  });
}

// One test per account: signIn waits for the page to go quiet, which a second sign-in in the same
// browser never does (the first one is enough to show the role).
for (const [email, role, name] of [
  ['member@example.test', 'member', '이회원'],
  ['operator@example.test', 'operator', '박운영'],
  ['admin@example.test', 'admin', '최관리'],
] as const) {
  test(`shows the ${role} their role`, async ({ page, baseURL }) => {
    await signIn(page, email, baseURL!);
    await page.goto('/ko/me');
    const main = page.locator('main');
    await expect(main.getByText(name, { exact: true })).toBeVisible();
    await expect(main.getByText(COPY.ko.roles[role], { exact: true })).toBeVisible();
  });
}

test('the header menu leads to My page', async ({ page, baseURL }) => {
  await signIn(page, 'guest@example.test', baseURL!);
  await openMenu(page);
  const toggle = page.getByRole('button', { name: /계정 메뉴/ });
  if (await toggle.isVisible()) await toggle.click();
  await page.locator('header').getByRole('link', { name: '마이페이지' }).click();
  await expect(page).toHaveURL(`${baseURL}/ko/me`);
  await expect(page.getByRole('heading', { level: 1, name: COPY.ko.title })).toBeVisible();
});

test('signing out from My page ends the session', async ({ page, baseURL }) => {
  await signIn(page, 'guest@example.test', baseURL!);
  await page.goto('/ko/me');
  await page.locator('main').getByRole('button', { name: COPY.ko.signOut, exact: true }).click();
  await expect(page).toHaveURL(`${baseURL}/ko`);
  expect(authCookies(await page.context().cookies())).toEqual([]);
  await page.goto('/ko/me');
  await expect(page).toHaveURL(`${baseURL}/ko/login?next=%2Fko%2Fme`);
});

test.describe('editing', () => {
  test('saves a new major and name, and records the recruitment answer only when it changes', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    try {
      await signUp(page, email, baseURL!);
      // A mark that a full page load would wipe: saving must not reload the page, so that the
      // header (which keeps its state across soft navigations) is told the name changed.
      await page.evaluate(() => {
        (window as unknown as { softNav: boolean }).softNav = true;
      });
      await openMenu(page);
      await expect(initialCircle(page)).toHaveText('박');

      let rows = await accountRows(email);
      expect(rows.consents.map((c) => c.kind)).toEqual(['privacy', 'age14', 'recruit']);
      expect(rows.profile.recruit_opt_in).toBe(false);

      // The major and the family name change; the recruitment answer does not.
      await page.locator('main').getByRole('link', { name: t.edit, exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/ko/me?edit=1`);
      await hydrated(page);
      await page.getByLabel(t.signUp.lastName, { exact: true }).fill('최');
      await page.getByLabel(t.signUp.major, { exact: true }).fill('컴퓨터공학');
      await page.getByRole('button', { name: t.save, exact: true }).click();

      await expect(page).toHaveURL(`${baseURL}/ko/me`);
      await expect(page.getByRole('heading', { level: 1, name: t.title })).toBeVisible();
      await expect(row(page, t.rows.major)).toContainText('컴퓨터공학');
      await expect(page.locator('main').getByText('최새롬', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => (window as unknown as { softNav?: boolean }).softNav)).toBe(
        true,
      );
      await openMenu(page);
      await expect(initialCircle(page)).toHaveText('최');

      rows = await accountRows(email);
      expect(rows.profile).toMatchObject({
        last_name: '최',
        major: '컴퓨터공학',
        school: '성균관대학교',
      });
      expect(rows.consents).toHaveLength(3);

      // Now the recruitment mail is switched on: one new entry in the log, and nothing else.
      await page.locator('main').getByRole('link', { name: t.edit, exact: true }).click();
      await expect(page.getByRole('checkbox', { name: t.signUp.recruit })).not.toBeChecked();
      await page.getByRole('checkbox', { name: t.signUp.recruit }).check();
      await page.getByRole('button', { name: t.save, exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/ko/me`);
      await expect(row(page, t.rows.recruit)).toContainText(t.rows.recruitOn);

      rows = await accountRows(email);
      expect(rows.profile.recruit_opt_in).toBe(true);
      expect(rows.profile.major).toBe('컴퓨터공학');
      expect(rows.consents.map((c) => [c.kind, c.granted])).toEqual([
        ['privacy', true],
        ['age14', true],
        ['recruit', false],
        ['recruit', true],
      ]);
      expect(rows.consents[3].policy_version).toBe(PRIVACY_POLICY_VERSION);

      // A founder has an affiliation instead of a school and a major; the answer to the
      // recruitment mail stays as it was, so the log does not grow.
      await page.locator('main').getByRole('link', { name: t.edit, exact: true }).click();
      // (A long name and affiliation, with no spaces to break at, stay inside the screen.)
      const longName = '라이즈'.repeat(15);
      const longAffiliation = '성균관대학교창업지원단라이즈크루스튜디오'.repeat(3);
      await page.getByRole('radio', { name: t.signUp.founder }).check();
      await page.getByLabel(t.signUp.firstName, { exact: true }).fill(longName);
      await page.getByLabel(t.signUp.affiliation, { exact: true }).fill(longAffiliation);
      await page.getByRole('button', { name: t.save, exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/ko/me`);
      await expect(row(page, t.rows.affiliation)).toContainText(longAffiliation);
      await expect(page.locator('main').getByText(`최${longName}`, { exact: true })).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expect(row(page, t.rows.school)).toHaveCount(0);
      await expect(row(page, t.rows.major)).toHaveCount(0);
      rows = await accountRows(email);
      expect(rows.profile).toMatchObject({
        occupation: 'founder',
        school: null,
        major: null,
        affiliation: longAffiliation,
      });
      expect(rows.consents).toHaveLength(4);

      // And switched off again: a second entry.
      await page.locator('main').getByRole('link', { name: t.edit, exact: true }).click();
      await page.getByRole('checkbox', { name: t.signUp.recruit }).uncheck();
      await page.getByRole('button', { name: t.save, exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/ko/me`);
      await expect(row(page, t.rows.recruit)).toContainText(t.rows.recruitOff);
      rows = await accountRows(email);
      expect(rows.profile.recruit_opt_in).toBe(false);
      expect(rows.consents).toHaveLength(5);
      expect(rows.consents[4]).toMatchObject({ kind: 'recruit', granted: false });
    } finally {
      await deleteAccount(email);
    }
  });

  test('says what is missing and keeps what was typed', async ({ page, baseURL }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    try {
      await signUp(page, email, baseURL!);
      await page.locator('main').getByRole('link', { name: t.edit, exact: true }).click();
      await hydrated(page);
      await page.getByLabel(t.signUp.major, { exact: true }).fill('');
      await page.getByLabel(t.signUp.firstName, { exact: true }).fill('은우');
      await page.getByRole('button', { name: t.save, exact: true }).click();

      await expect(alert(page)).toHaveText('확인이 필요한 항목이 1개 있어요.');
      await expect(page.getByText('전공을 입력해 주세요.')).toBeVisible();
      await expect(page.getByLabel(t.signUp.major, { exact: true })).toBeFocused();
      await expect(page.getByLabel(t.signUp.firstName, { exact: true })).toHaveValue('은우');
      await expectAccessible(page);
      await expectNoHorizontalScroll(page);
      expect((await accountRows(email)).profile).toMatchObject({
        first_name: '새롬',
        major: '경영학',
      });
    } finally {
      await deleteAccount(email);
    }
  });

  test('ignores a form that has been tampered with', async ({ page, baseURL }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    try {
      // A new account, with the sign-up form open.
      const next = '/ko/me';
      await page.goto(await requestSignInLink(email, baseURL!, { next }));
      await expect(page).toHaveURL(/\/ko\/welcome/);
      await hydrated(page);
      const fill = async (major: string) => {
        await page.getByLabel(t.signUp.lastName, { exact: true }).fill('박');
        await page.getByLabel(t.signUp.firstName, { exact: true }).fill('새롬');
        await page.getByRole('radio', { name: t.signUp.undergrad }).check();
        await page.getByLabel(t.signUp.school, { exact: true }).fill('성균관대학교');
        await page.getByLabel(t.signUp.major, { exact: true }).fill(major);
        await page.getByRole('checkbox', { name: t.signUp.age14 }).check();
        await page.getByRole('checkbox', { name: t.signUp.privacy }).check();
      };

      // 1. An account that has not signed up cannot use the edit form's mode to skip the sign-up
      //    (and its consents): nothing is saved, and it is sent back to the form.
      await fill('경영학');
      await tamper(page, 'mode', 'edit');
      await clickAndWaitForAction(page, page.getByRole('button', { name: t.signUp.submit }));
      await expect(page).toHaveURL(/\/ko\/welcome\?next=/);
      await expect(page.getByRole('heading', { level: 1, name: '반가워요!' })).toBeVisible();
      let rows = await accountRows(email);
      expect(rows.profile.onboarded_at).toBeNull();
      expect(rows.profile.last_name).toBeNull();
      expect(rows.consents).toEqual([]);

      // 2. A `next` that leaves the site is not followed: the account is signed up, and the
      //    visitor ends on this site's home.
      await page.reload();
      await expect(page.getByLabel(t.signUp.lastName, { exact: true })).toBeVisible();
      await fill('경영학');
      await tamper(page, 'next', 'https://evil.example');
      await page.getByRole('button', { name: t.signUp.submit }).click();
      await expect(page).toHaveURL(`${baseURL}/ko`);
      rows = await accountRows(email);
      expect(rows.profile.onboarded_at).not.toBeNull();
      expect(rows.consents).toHaveLength(3);

      // 3. The edit form claiming to be the sign-up form writes nothing, not even consents: the
      //    sign-up is already done, so the visitor is simply carried on.
      await page.goto('/ko/me?edit=1');
      await hydrated(page);
      await page.getByLabel(t.signUp.major, { exact: true }).fill('바뀌면 안 되는 전공');
      await page.getByRole('checkbox', { name: t.signUp.recruit }).check();
      await tamper(page, 'mode', 'welcome');
      await page.getByRole('button', { name: t.save, exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/ko/me`);
      rows = await accountRows(email);
      expect(rows.consents).toHaveLength(3);
      expect(rows.profile.major).toBe('경영학');
      expect(rows.profile.recruit_opt_in).toBe(false);

      // 4. A valid edit with a `next` that leaves the site is saved, and ends on this site.
      await page.goto('/ko/me?edit=1');
      await hydrated(page);
      await page.getByLabel(t.signUp.major, { exact: true }).fill('컴퓨터공학');
      await tamper(page, 'next', 'https://evil.example');
      await page.getByRole('button', { name: t.save, exact: true }).click();
      await expect(page).toHaveURL(`${baseURL}/ko`);
      rows = await accountRows(email);
      expect(rows.profile.major).toBe('컴퓨터공학');
      expect(rows.consents).toHaveLength(3);
    } finally {
      await deleteAccount(email);
    }
  });
});

for (const locale of ['ko', 'en'] as const) {
  const t = COPY[locale];

  test.describe(`deleting the account (${locale})`, () => {
    test('asks for the word first, then deletes everything and signs out', async ({
      page,
      baseURL,
    }, testInfo) => {
      const email = newAddress(testInfo);
      try {
        await signUp(page, email, baseURL!, { locale, recruit: true });
        const id = (await accountRows(email)).profile.id;
        expect(await leftovers(id)).toEqual({ authUser: true, profiles: 1, roles: 1, consents: 3 });
        // A mark that a full page load would wipe: the header must learn about the deletion
        // without one.
        await page.evaluate(() => {
          (window as unknown as { softNav: boolean }).softNav = true;
        });
        await openMenu(page);
        await expect(initialCircle(page)).toBeVisible();

        // Folded away until asked for.
        const input = page.getByLabel(t.remove.prompt);
        await expect(input).toBeHidden();
        await removeSummary(page, locale).click();
        await expect(page.getByRole('heading', { name: t.remove.heading })).toBeVisible();
        await expect(input).toBeVisible();
        await expect(page.getByRole('button', { name: t.remove.submit })).toBeEnabled();
        await expectNoHorizontalScroll(page);
        await expectAccessible(page);

        // Nothing typed: refused, with a message that names the word. Focus goes to the field.
        await sendWrongWord(page, locale, '');
        await expectNoHorizontalScroll(page);
        await expectAccessible(page);
        expect((await leftovers(id)).authUser).toBe(true);

        // Another word: refused as well, and what was typed is kept for the next try.
        await sendWrongWord(page, locale, locale === 'ko' ? '탈퇴해요' : 'remove');
        expect((await leftovers(id)).authUser).toBe(true);
        // (A word that only differs in case is not the word either.)
        await sendWrongWord(
          page,
          locale,
          t.remove.word.toUpperCase() + (locale === 'ko' ? '!' : ''),
        );
        expect((await leftovers(id)).authUser).toBe(true);

        // The word, with a space around it as a phone's keyboard may leave: the account goes.
        await input.fill(` ${t.remove.word} `);
        await page.getByRole('button', { name: t.remove.submit }).click();
        await expect(page).toHaveURL(`${baseURL}/${locale}?deleted=1`);

        // The home page says so, once, politely.
        await expect(page.getByRole('status').filter({ hasText: t.notice })).toBeVisible();
        // The header shows nobody, and no page reload was needed to find out.
        expect(
          await page.evaluate(() => (window as unknown as { softNav?: boolean }).softNav),
        ).toBe(true);
        await expect(initialCircle(page)).toHaveCount(0);
        await openMenu(page);
        await expect(
          page.locator('header').getByRole('link', { name: t.signIn, exact: true }),
        ).toBeVisible();
        expect(authCookies(await page.context().cookies())).toEqual([]);

        // The auth user, the profile, the role and the consent log are all gone.
        expect(await leftovers(id)).toEqual({
          authUser: false,
          profiles: 0,
          roles: 0,
          consents: 0,
        });

        // My page no longer opens for this browser.
        await page.goto(`/${locale}/me`);
        await expect(page).toHaveURL(`${baseURL}/${locale}/login?next=%2F${locale}%2Fme`);

        // Signing in again with the same address starts over, at the sign-up form.
        await page.goto(await requestSignInLink(email, baseURL!, { locale }));
        await expect(page).toHaveURL(`${baseURL}/${locale}/welcome?next=%2F${locale}`);
        const fresh = await accountRows(email);
        expect(fresh.profile.id).not.toBe(id);
        expect(fresh.profile.onboarded_at).toBeNull();
        expect(fresh.profile.last_name).toBeNull();
        expect(fresh.consents).toEqual([]);
      } finally {
        await deleteAccount(email);
      }
    });
  });
}

test.describe('deleting the account, with the keyboard alone', () => {
  test('opens, asks, and deletes', async ({ page, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'keyboard order is the same on a phone');
    const t = COPY.en;
    const email = newAddress(testInfo);
    try {
      await signUp(page, email, baseURL!, { locale: 'en' });
      const id = (await accountRows(email)).profile.id;

      // Tab reaches the fold, Enter opens it, and the field is next.
      const summary = removeSummary(page, 'en');
      await summary.focus();
      await expect(summary).toBeFocused();
      await page.keyboard.press('Enter');
      const input = page.getByLabel(t.remove.prompt);
      await expect(input).toBeVisible();
      await page.keyboard.press('Tab');
      await expect(input).toBeFocused();

      // Enter in the field sends it: first with the wrong word.
      await page.keyboard.type('nope');
      await page.keyboard.press('Enter');
      await expect(alert(page)).toHaveText(t.remove.wrong);
      await expect(input).toBeFocused();
      await expect(input).toHaveValue('nope');

      await input.fill('');
      await page.keyboard.type(t.remove.word);
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: t.remove.submit })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(`${baseURL}/en?deleted=1`);
      expect((await leftovers(id)).authUser).toBe(false);
    } finally {
      await deleteAccount(email);
    }
  });

  test('the edit link moves focus into the edit screen', async ({ page, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'keyboard order is the same on a phone');
    await signIn(page, 'guest@example.test', baseURL!);
    await page.goto('/ko/me');
    await hydrated(page);
    const link = page.locator('main').getByRole('link', { name: COPY.ko.edit, exact: true });
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`${baseURL}/ko/me?edit=1`);
    // Focus is not left on a link that is no longer there: it moves to the new screen's heading,
    // which a screen reader reads out.
    await expect(page.getByRole('heading', { level: 1, name: COPY.ko.editTitle })).toBeFocused();

    // And back again with the cancel link.
    await page.locator('main').getByRole('link', { name: COPY.ko.cancel, exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`${baseURL}/ko/me`);
    await expect(page.getByRole('heading', { level: 1, name: COPY.ko.title })).toBeFocused();
  });
});

test.describe('deleting the account, when things changed since the page opened', () => {
  test('a blocked account is refused and its account stays', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    try {
      await signUp(page, email, baseURL!);
      const id = (await accountRows(email)).profile.id;
      await removeSummary(page, 'ko').click();
      await page.getByLabel(t.remove.prompt).fill(t.remove.word);

      const { error } = await adminClient()
        .from('user_roles')
        .update({ blocked_at: new Date().toISOString() })
        .eq('user_id', id);
      expect(error).toBeNull();

      await page.getByRole('button', { name: t.remove.submit }).click();
      await expect(page).toHaveURL(`${baseURL}/ko/login?error=blocked`);
      expect((await leftovers(id)).authUser).toBe(true);
    } finally {
      await deleteAccount(email);
    }
  });

  test('a visitor who has been signed out is sent to sign in, and nothing is deleted', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    try {
      await signUp(page, email, baseURL!);
      const id = (await accountRows(email)).profile.id;
      await removeSummary(page, 'ko').click();
      await page.getByLabel(t.remove.prompt).fill(t.remove.word);

      // The session ended in another tab, say.
      await page.context().clearCookies();
      await page.getByRole('button', { name: t.remove.submit }).click();
      await expect(page).toHaveURL(`${baseURL}/ko/login?next=%2Fko%2Fme`);
      expect((await leftovers(id)).authUser).toBe(true);
    } finally {
      await deleteAccount(email);
    }
  });
});

test.describe('the line on the home page after a deletion', () => {
  for (const locale of ['ko', 'en'] as const) {
    test(`says so when the address asks it to (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}?deleted=1`);
      await expect(page.getByRole('status').filter({ hasText: COPY[locale].notice })).toBeVisible();
      await expectNoHorizontalScroll(page);

      // Without the query, or with another value, the home page is as it always was.
      for (const path of [`/${locale}`, `/${locale}?deleted=0`, `/${locale}?deleted=yes`]) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.getByText(COPY[locale].notice)).toHaveCount(0);
      }
    });
  }

  test('does not make the home page dynamic', async ({ request }) => {
    // The address is read in the browser: the server answers every query string with the same
    // prerendered page, which is cached for a day and not rendered per request.
    for (const path of ['/ko', '/ko?deleted=1', '/en?deleted=1']) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()['x-nextjs-prerender'], path).toMatch(/^1/);
      expect(response.headers()['cache-control'], path).toMatch(/s-maxage=86400/);
    }
  });
});

test.describe('before the page has loaded its scripts', () => {
  // The delete step is a plain form inside a plain <details>: it works for a browser that never
  // runs the page's JavaScript. (Without motion the page jumps instead of gliding.)
  test.use({ javaScriptEnabled: false, reducedMotion: 'reduce' });

  test('a wrong word comes back with its message, the right word deletes the account', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    try {
      await signUp(page, email, baseURL!, { scripts: false });
      const id = (await accountRows(email)).profile.id;

      await removeSummary(page, 'ko').click();
      await page.getByLabel(t.remove.prompt).fill('아니요');
      await page.getByRole('button', { name: t.remove.submit }).click();

      // The screen is back with the fold open and the message in it.
      await expect(page).toHaveURL(`${baseURL}/ko/me`);
      await expect(alert(page)).toHaveText(t.remove.wrong);
      await expect(page.getByLabel(t.remove.prompt)).toBeVisible();
      expect((await leftovers(id)).authUser).toBe(true);

      await page.getByLabel(t.remove.prompt).fill(t.remove.word);
      await page.getByRole('button', { name: t.remove.submit }).click();
      await expect(page).toHaveURL(`${baseURL}/ko?deleted=1`);
      expect(await leftovers(id)).toEqual({ authUser: false, profiles: 0, roles: 0, consents: 0 });
      expect(authCookies(await page.context().cookies())).toEqual([]);
    } finally {
      await deleteAccount(email);
    }
  });
});
