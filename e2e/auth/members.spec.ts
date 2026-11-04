import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test';
import { expectAccessible, expectNoHorizontalScroll } from '../helpers';
import {
  accountId,
  adminClient,
  bannedUntil,
  createBlockedAccount,
  createOnboardedAccount,
  deleteAccount,
  requestSignInLink,
  roleRow,
  signIn,
} from './helpers';

type Locale = 'ko' | 'en';

// Every run creates its own fake accounts (example.test addresses) and deletes them afterwards, so
// the seeded four are only read, and the tests do not depend on each other.
let counter = 0;
function newAddress(testInfo: TestInfo, label = 'm'): string {
  return `${label}-${testInfo.project.name}-${Date.now()}-${counter++}@example.test`;
}

const COPY = {
  ko: {
    title: '회원 관리',
    searchLabel: '이름 또는 이메일 검색',
    search: '검색',
    roleFilter: '역할',
    optIn: '모집 소식 동의만',
    selectHeader: '선택',
    columns: ['이름', '이메일', '하고 있는 일', '학교·전공 / 소속', '모집 소식', '역할'],
    roles: { guest: '가입자', member: '회원', operator: '운영진', admin: '관리자' },
    blocked: '차단됨',
    yes: '동의',
    no: '미동의',
    none: '정보 없음',
    button: {
      member: '회원으로',
      guest: '가입자로',
      operator: '운영진으로',
      admin: '관리자로',
      block: '차단',
      unblock: '차단 해제',
    },
    done: {
      member: (n: number) => `${n}명을 회원으로 바꿨어요.`,
      guest: (n: number) => `${n}명을 가입자로 바꿨어요.`,
      operator: (n: number) => `${n}명을 운영진으로 바꿨어요.`,
      admin: (n: number) => `${n}명을 관리자로 바꿨어요.`,
      block: (n: number) => `${n}명을 차단했어요.`,
      unblock: (n: number) => `${n}명의 차단을 풀었어요.`,
    },
    // The button names once people are ticked.
    counted: {
      member: (n: number) => `${n}명을 회원으로`,
      guest: (n: number) => `${n}명을 가입자로`,
      operator: (n: number) => `${n}명을 운영진으로`,
      admin: (n: number) => `${n}명을 관리자로`,
      block: (n: number) => `${n}명 차단`,
      unblock: (n: number) => `${n}명 차단 해제`,
    },
    // The question that replaces the buttons of a consequential change.
    confirm: {
      block: { question: (n: number) => `${n}명을 차단할까요?`, yes: '차단하기' },
      operator: {
        question: (n: number) => `${n}명을 운영진으로 바꿀까요?`,
        yes: '운영진으로 바꾸기',
      },
      admin: { question: (n: number) => `${n}명을 관리자로 바꿀까요?`, yes: '관리자로 바꾸기' },
      // Asked only when the people include staff, who would lose their role.
      member: { question: (n: number) => `${n}명을 회원으로 바꿀까요?`, yes: '회원으로 바꾸기' },
      guest: { question: (n: number) => `${n}명을 가입자로 바꿀까요?`, yes: '가입자로 바꾸기' },
      staffLoss: (n: number) => `운영진이나 관리자 ${n}명이 그 역할을 잃어요.`,
      selfLoss: '내 계정도 포함돼 있어서, 바꾸면 회원 관리 화면을 더 쓸 수 없어요.',
      cancel: '취소',
    },
    selected: (n: number) => `${n}명 선택`,
    refusedRole: '아무도 바꾸지 않았어요.',
    refusedBlock: '아무도 차단하지 않았어요.',
    // One sentence for each reason; `who` is a name and "님".
    reason: {
      same: (who: string, role: string) =>
        `${who}은 이미 ${role} 역할이에요. 선택에서 빼고 다시 눌러 주세요.`,
      authorityRole: (who: string) =>
        `${who}은 내 권한으로 바꿀 수 없어요. 운영진은 가입자와 회원 사이만 바꿀 수 있어요. 그 밖의 변경은 관리자에게 부탁해 주세요.`,
      authorityBlock: (who: string) =>
        `${who}은 운영진이나 관리자라서 내 권한으로 차단할 수 없어요. 관리자에게 부탁해 주세요.`,
      self: (who: string) =>
        `${who}은 본인 계정이라 직접 차단하거나 풀 수 없어요. 선택에서 빼고 다시 눌러 주세요.`,
    },
    lastAdmin: '관리자가 한 명도 남지 않게 돼서 할 수 없어요. 먼저 다른 관리자를 지정해 주세요.',
    chooseFirst: '바꿀 사람을 먼저 골라 주세요.',
    missing: '목록에 없는 사람이 있어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.',
    // The login page's notice for a blocked account.
    blockedNotice: '이용이 제한된 계정이에요.',
    empty: '조건에 맞는 회원이 없어요.',
    clear: '필터 지우기',
    next: '다음',
    previous: '이전',
    // Seeded accounts: display name in this language, the details the table shows.
    guestName: '김가입',
    memberName: '이회원',
    operatorName: '박운영',
    adminName: '최관리',
    undergrad: '대학생',
    // My page, delete step.
    lastAdminDelete:
      '마지막 관리자라서 지금은 탈퇴할 수 없어요. 다른 관리자를 지정한 뒤 탈퇴할 수 있어요.',
    deleteSummary: '회원 탈퇴',
    deleteWord: '탈퇴',
    deletePrompt: /계속하려면/,
    deleteSubmit: '탈퇴하기',
  },
  en: {
    title: 'Members',
    searchLabel: 'Search by name or email',
    search: 'Search',
    roleFilter: 'Role',
    optIn: 'Recruitment opt-in only',
    selectHeader: 'Select',
    columns: [
      'Name',
      'Email',
      'What they do',
      'School · major / Affiliation',
      'Recruitment emails',
      'Role',
    ],
    roles: { guest: 'Guest', member: 'Member', operator: 'Operator', admin: 'Admin' },
    blocked: 'Blocked',
    yes: 'Yes',
    no: 'No',
    none: 'No info',
    button: {
      member: 'Make member',
      guest: 'Make guest',
      operator: 'Make operator',
      admin: 'Make admin',
      block: 'Block',
      unblock: 'Unblock',
    },
    done: {
      member: (n: number) =>
        n === 1 ? '1 person is now a member.' : `${n} people are now members.`,
      guest: (n: number) => (n === 1 ? '1 person is now a guest.' : `${n} people are now guests.`),
      operator: (n: number) =>
        n === 1 ? '1 person is now an operator.' : `${n} people are now operators.`,
      admin: (n: number) => (n === 1 ? '1 person is now an admin.' : `${n} people are now admins.`),
      block: (n: number) => (n === 1 ? '1 person was blocked.' : `${n} people were blocked.`),
      unblock: (n: number) => (n === 1 ? '1 person was unblocked.' : `${n} people were unblocked.`),
    },
    counted: {
      member: (n: number) => (n === 1 ? 'Make 1 member' : `Make ${n} members`),
      guest: (n: number) => (n === 1 ? 'Make 1 guest' : `Make ${n} guests`),
      operator: (n: number) => (n === 1 ? 'Make 1 operator' : `Make ${n} operators`),
      admin: (n: number) => (n === 1 ? 'Make 1 admin' : `Make ${n} admins`),
      block: (n: number) => (n === 1 ? 'Block 1 person' : `Block ${n} people`),
      unblock: (n: number) => (n === 1 ? 'Unblock 1 person' : `Unblock ${n} people`),
    },
    confirm: {
      block: {
        question: (n: number) => (n === 1 ? 'Block 1 person?' : `Block ${n} people?`),
        yes: 'Block',
      },
      operator: {
        question: (n: number) =>
          n === 1 ? 'Make 1 person an operator?' : `Make ${n} people operators?`,
        yes: 'Make operator',
      },
      admin: {
        question: (n: number) => (n === 1 ? 'Make 1 person an admin?' : `Make ${n} people admins?`),
        yes: 'Make admin',
      },
      member: {
        question: (n: number) =>
          n === 1 ? 'Make 1 person a member?' : `Make ${n} people members?`,
        yes: 'Make member',
      },
      guest: {
        question: (n: number) => (n === 1 ? 'Make 1 person a guest?' : `Make ${n} people guests?`),
        yes: 'Make guest',
      },
      staffLoss: (n: number) =>
        n === 1
          ? '1 operator or admin will lose that role.'
          : `${n} operators or admins will lose those roles.`,
      selfLoss: 'Your own account is one of them, so you will lose access to this screen.',
      cancel: 'Cancel',
    },
    selected: (n: number) => `${n} selected`,
    refusedRole: 'No one was changed.',
    refusedBlock: 'No one was blocked.',
    reason: {
      same: (who: string, role: string, n = 1) =>
        `${who} ${n === 1 ? 'already has' : 'already have'} the ${role} role. Take them off the selection and try again.`,
      authorityRole: (who: string) =>
        `${who} can't be changed with your access. Operators can only move people between Guest and Member; ask an admin for anything else.`,
      authorityBlock: (who: string) =>
        `${who} can't be blocked with your access, because they're an operator or an admin. Ask an admin to do it.`,
      self: (who: string) =>
        `${who} is your own account, so you can't block or unblock it. Take yourself off the selection and try again.`,
    },
    lastAdmin: 'That would leave the site without an admin. Make someone else an admin first.',
    chooseFirst: 'Choose who to change first.',
    missing: 'Some of these people are no longer on the list. Reload the page and try again.',
    blockedNotice: 'This account has been suspended.',
    empty: 'No one matches.',
    clear: 'Clear filters',
    next: 'Next',
    previous: 'Previous',
    guestName: '가입 김',
    memberName: '회원 이',
    operatorName: '운영 박',
    adminName: '관리 최',
    undergrad: 'Undergraduate',
    lastAdminDelete:
      "You're the only admin, so you can't delete your account yet. Make someone else an admin before deleting your account.",
    deleteSummary: 'Delete account',
    deleteWord: 'delete',
    deletePrompt: /To continue/,
    deleteSubmit: 'Delete my account',
  },
} as const;

const SEEDED = {
  guest: 'guest@example.test',
  member: 'member@example.test',
  operator: 'operator@example.test',
  admin: 'admin@example.test',
} as const;

// Waits until the page's scripts have taken over the table's form: React marks the elements it has
// hydrated. (The network going quiet is no use for this: Next's prefetches can stay open.)
async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const form = document.querySelector('main form[data-members-form]');
    return form !== null && Object.keys(form).some((key) => key.startsWith('__reactProps$'));
  });
}

// Opens the list, narrowed down to the people in `q` (an address or a name), and waits for it.
async function openList(
  page: Page,
  locale: Locale,
  params: Record<string, string> = {},
  { scripts = true }: { scripts?: boolean } = {},
) {
  const query = new URLSearchParams(params).toString();
  const response = await page.goto(`/${locale}/admin/members${query ? `?${query}` : ''}`);
  expect(response?.status()).toBe(200);
  if (scripts) await hydrated(page);
}

function table(page: Page) {
  return page.locator('main form[data-members-form]');
}

// The row of the person with this address (every row shows the address).
function rowOf(page: Page, email: string): Locator {
  return page.getByRole('row').filter({ hasText: email });
}

function tickOf(page: Page, email: string): Locator {
  return rowOf(page, email).getByRole('checkbox');
}

type ButtonName = keyof (typeof COPY)['ko']['button'];
// The changes that can ask "are you sure?" first.
type AskedName = keyof (typeof COPY)['ko']['confirm'] & ButtonName;
// The ones that always ask. "Member" and "guest" ask only when the people include staff, who
// would lose their role.
const ASKED: readonly ButtonName[] = ['block', 'operator', 'admin'];

// An action button. Once people are ticked its name says how many ("3명을 회원으로"); with nobody
// ticked it is the plain name.
function button(page: Page, locale: Locale, name: ButtonName, count = 0) {
  const label = count > 0 ? COPY[locale].counted[name](count) : COPY[locale].button[name];
  return table(page).getByRole('button', { name: label, exact: true });
}

function confirmButton(page: Page, locale: Locale, name: AskedName) {
  return table(page).getByRole('button', { name: COPY[locale].confirm[name].yes, exact: true });
}

function cancelButton(page: Page, locale: Locale) {
  return table(page).getByRole('button', { name: COPY[locale].confirm.cancel, exact: true });
}

// The question that takes the buttons' place, found by its words.
function question(page: Page, locale: Locale, name: AskedName, count: number) {
  return table(page).getByRole('group', { name: COPY[locale].confirm[name].question(count) });
}

// The strip with the answer and the buttons (it floats at the bottom of a phone's screen).
function actionBar(page: Page) {
  return table(page).locator('[data-action-bar]');
}

// The page's own messages (Next also keeps an empty alert in the page for route announcements).
function status(page: Page) {
  return page.locator('main').getByRole('status');
}
function alert(page: Page) {
  return page.locator('main').getByRole('alert');
}

// Ticks the people with these addresses and presses a button, then waits for the answer. A change
// that asks "are you sure?" (`asks`: the ones in ASKED, unless said otherwise) is confirmed too,
// unless `confirm` is false.
async function apply(
  page: Page,
  locale: Locale,
  emails: string[],
  name: ButtonName,
  { confirm = true, asks = ASKED.includes(name) }: { confirm?: boolean; asks?: boolean } = {},
) {
  for (const email of emails) await tickOf(page, email).check();
  await button(page, locale, name, emails.length).click();
  if (confirm && asks) await confirmButton(page, locale, name as AskedName).click();
}

async function signedInPage(
  browser: Browser,
  baseURL: string,
  email: string,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await signIn(page, email, baseURL);
  return { context, page };
}

// ---------------------------------------------------------------------------

test.describe('who gets the members screen', () => {
  for (const locale of ['ko', 'en'] as const) {
    test(`a visitor who is signed out is sent to sign in first (${locale})`, async ({
      page,
      baseURL,
    }) => {
      await page.goto(`/${locale}/admin/members`);
      await expect(page).toHaveURL(
        `${baseURL}/${locale}/login?next=%2F${locale}%2Fadmin%2Fmembers`,
      );
    });
  }

  for (const [role, email] of [
    ['guest', SEEDED.guest],
    ['member', SEEDED.member],
  ] as const) {
    for (const locale of ['ko', 'en'] as const) {
      test(`a ${role} gets a 404, as if there were no such page (${locale})`, async ({
        page,
        baseURL,
      }) => {
        await signIn(page, email, baseURL!);
        const response = await page.goto(`/${locale}/admin/members`);
        expect(response?.status()).toBe(404);
        await expect(page.getByRole('heading', { name: COPY[locale].title })).toHaveCount(0);
        await expect(page.locator('main form[data-members-form]')).toHaveCount(0);
      });
    }
  }

  test('a blocked operator gets the 404 whatever the token says', async ({
    request,
    baseURL,
  }, testInfo) => {
    const email = newAddress(testInfo);
    try {
      await createBlockedAccount(email);
      await adminClient()
        .from('user_roles')
        .update({ role: 'operator' })
        .eq('user_id', await accountId(email));
      await request.get(await requestSignInLink(email, baseURL!));
      const response = await request.get('/ko/admin/members', { maxRedirects: 0 });
      expect(response.status()).toBe(404);
    } finally {
      await deleteAccount(email);
    }
  });
});

for (const locale of ['ko', 'en'] as const) {
  const t = COPY[locale];

  test.describe(`the list as an operator (${locale})`, () => {
    test('shows everyone with the details, and only the operator buttons', async ({
      page,
      baseURL,
    }) => {
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, locale);

      await expect(page.getByRole('heading', { level: 1, name: t.title })).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

      // The columns, in order.
      const heads = page.getByRole('columnheader');
      await expect(heads).toHaveText([t.selectHeader, ...t.columns]);

      // The four seeded people, with their details. (Other rows may be there too.)
      const guest = rowOf(page, SEEDED.guest);
      await expect(guest).toContainText(t.guestName);
      await expect(guest).toContainText(t.undergrad);
      await expect(guest).toContainText('성균관대학교 · 경영학');
      await expect(guest.locator('[data-col="optin"] [data-value]')).toHaveText(t.yes);
      await expect(guest.locator('[data-col="role"]')).toContainText(t.roles.guest);

      const member = rowOf(page, SEEDED.member);
      await expect(member).toContainText(t.memberName);
      await expect(member).toContainText('성균관대학교 · 컴퓨터공학');
      await expect(member.locator('[data-col="optin"] [data-value]')).toHaveText(t.no);
      await expect(member.locator('[data-col="role"]')).toContainText(t.roles.member);

      // Not a student: the affiliation stands in for school and major.
      const operator = rowOf(page, SEEDED.operator);
      await expect(operator).toContainText(t.operatorName);
      await expect(operator).toContainText('예시 스튜디오');
      await expect(operator.locator('[data-col="optin"] [data-value]')).toHaveText(t.yes);
      await expect(operator.locator('[data-col="role"]')).toContainText(t.roles.operator);

      const admin = rowOf(page, SEEDED.admin);
      await expect(admin).toContainText(t.adminName);
      await expect(admin.locator('[data-col="detail"]')).toContainText(t.none);
      await expect(admin.locator('[data-col="role"]')).toContainText(t.roles.admin);

      // An operator cannot change staff, so those rows cannot be ticked; the others can.
      await expect(tickOf(page, SEEDED.guest)).toBeEnabled();
      await expect(tickOf(page, SEEDED.member)).toBeEnabled();
      await expect(tickOf(page, SEEDED.operator)).toBeDisabled();
      await expect(tickOf(page, SEEDED.admin)).toBeDisabled();

      // The buttons an operator has, and not the ones an admin has.
      for (const name of ['member', 'guest', 'block', 'unblock'] as const) {
        await expect(button(page, locale, name)).toBeVisible();
      }
      await expect(table(page).getByRole('button', { name: t.button.operator })).toHaveCount(0);
      await expect(table(page).getByRole('button', { name: t.button.admin })).toHaveCount(0);
      await expect(page.locator('main [name="to"][value="operator"]')).toHaveCount(0);
      await expect(page.locator('main [name="to"][value="admin"]')).toHaveCount(0);

      // No way to take the list out of the site.
      await expect(
        page.locator('main').getByRole('link', { name: /csv|export|download|내려받기|다운로드/i }),
      ).toHaveCount(0);
      await expect(page.locator('main a[download]')).toHaveCount(0);

      await expectNoHorizontalScroll(page);
      await expectAccessible(page);
    });

    test('searches by name or email and filters by role and recruitment opt-in', async ({
      page,
      baseURL,
    }) => {
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, locale);

      // Opt-in only: the guest and the operator said yes, the member and the admin did not.
      await page.getByRole('checkbox', { name: t.optIn }).check();
      await page.getByRole('button', { name: t.search, exact: true }).click();
      await expect(page).toHaveURL(/optin=1/);
      await expect(rowOf(page, SEEDED.guest)).toBeVisible();
      await expect(rowOf(page, SEEDED.operator)).toBeVisible();
      await expect(rowOf(page, SEEDED.member)).toHaveCount(0);
      await expect(rowOf(page, SEEDED.admin)).toHaveCount(0);
      // Every row that is left says yes. (The filter is still ticked after the search.)
      await expect(page.getByRole('checkbox', { name: t.optIn })).toBeChecked();
      const answers = await page
        .locator('main tbody [data-col="optin"] [data-value]')
        .allTextContents();
      expect(answers.length).toBeGreaterThan(1);
      expect(new Set(answers.map((a) => a.trim()))).toEqual(new Set([t.yes]));

      // A role: only the member.
      await page.goto(`/${locale}/admin/members`);
      await page.getByRole('combobox', { name: t.roleFilter, exact: true }).selectOption('member');
      await page.getByRole('button', { name: t.search, exact: true }).click();
      await expect(page).toHaveURL(/role=member/);
      await expect(rowOf(page, SEEDED.member)).toBeVisible();
      for (const email of [SEEDED.guest, SEEDED.operator, SEEDED.admin]) {
        await expect(rowOf(page, email)).toHaveCount(0);
      }

      // A name, written as the language writes it, and a bit of an address in capitals.
      await page.goto(`/${locale}/admin/members`);
      const box = page.getByRole('searchbox', { name: t.searchLabel });
      await box.fill('이회원');
      await page.getByRole('button', { name: t.search, exact: true }).click();
      await expect(rowOf(page, SEEDED.member)).toBeVisible();
      await expect(rowOf(page, SEEDED.guest)).toHaveCount(0);

      await box.fill('OPERATOR@EXAMPLE');
      await page.getByRole('button', { name: t.search, exact: true }).click();
      await expect(rowOf(page, SEEDED.operator)).toBeVisible();
      await expect(rowOf(page, SEEDED.member)).toHaveCount(0);

      // Narrowed down together: the search and the role.
      await page.goto(`/${locale}/admin/members?q=example.test&role=admin`);
      await expect(rowOf(page, SEEDED.admin)).toBeVisible();
      await expect(rowOf(page, SEEDED.operator)).toHaveCount(0);

      // Nobody: a message, a way back, and no table to act on.
      await page.goto(`/${locale}/admin/members?q=zzz-no-one-has-this-name`);
      await expect(page.locator('main').getByText(t.empty)).toBeVisible();
      await expect(table(page)).toHaveCount(0);
      await page.locator('main').getByRole('link', { name: t.clear }).click();
      await expect(page).toHaveURL(`${baseURL}/${locale}/admin/members`);
      await expect(rowOf(page, SEEDED.member)).toBeVisible();

      // What was typed is taken literally: "%" is not "anything".
      await page.goto(`/${locale}/admin/members?q=%25`);
      await expect(page.locator('main').getByText(t.empty)).toBeVisible();
      await page.goto(`/${locale}/admin/members?q=_`);
      await expect(page.locator('main').getByText(t.empty)).toBeVisible();

      await expectAccessible(page);
      await expectNoHorizontalScroll(page);
    });
  });
}

test.describe('an account that has not finished signing up', () => {
  test('is not on the list, a crafted request for it changes nobody, and names are found in either order', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo, 'unfinished');
    const done = newAddress(testInfo, 'done');
    try {
      const created = await adminClient().auth.admin.createUser({ email, email_confirm: true });
      expect(created.error).toBeNull();
      const unfinishedId = created.data.user!.id;
      const doneId = await createOnboardedAccount(done, { names: ['한', '지민'] });

      // Even an admin does not see it: not under its own address, and not among the others made
      // by this test.
      await signIn(page, SEEDED.admin, baseURL!);
      // (An empty list has no form for the page's scripts to take over.)
      await openList(page, 'ko', { q: email }, { scripts: false });
      await expect(page.locator('main').getByText(t.empty)).toBeVisible();
      await expect(table(page)).toHaveCount(0);
      await openList(page, 'ko', { q: `-${testInfo.project.name}-` });
      await expect(rowOf(page, done)).toHaveCount(1);
      await expect(rowOf(page, email)).toHaveCount(0);

      // Its id, added to the form by hand, is somebody who is not there: the whole batch is
      // refused and nobody changes.
      await tickOf(page, done).check();
      await page.evaluate((value) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'id';
        input.value = value;
        document.querySelector('main form[data-members-form]')!.append(input);
      }, unfinishedId);
      await button(page, 'ko', 'member', 1).click();
      await expect(alert(page)).toHaveText(t.missing);
      expect((await roleRow(unfinishedId)).role).toBe('guest');
      expect((await roleRow(doneId)).role).toBe('guest');

      // Family name first, no space (Korean); the given name alone; the English order.
      for (const q of ['한지민', '지민', '지민 한', '한 지민']) {
        await openList(page, 'ko', { q });
        await expect(rowOf(page, done), q).toBeVisible();
      }
    } finally {
      await deleteAccount(email);
      await deleteAccount(done);
    }
  });
});

test.describe('changing roles as an operator', () => {
  test('moves a guest to member and back, and the database records who did it', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    try {
      const id = await createOnboardedAccount(email);
      const operatorId = await accountId(SEEDED.operator);
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, 'ko', { q: email });

      // Nobody chosen yet: the buttons wait, and nothing changes.
      await expect(button(page, 'ko', 'member')).toBeDisabled();
      expect((await roleRow(id)).role).toBe('guest');

      await apply(page, 'ko', [email], 'member');
      await expect(status(page)).toHaveText(t.done.member(1));
      // The list shows the new role without a reload, and the selection is cleared.
      await expect(rowOf(page, email).locator('[data-col="role"]')).toContainText(t.roles.member);
      await expect(tickOf(page, email)).not.toBeChecked();
      const promoted = await roleRow(id);
      expect(promoted).toMatchObject({ role: 'member', blocked_at: null, updated_by: operatorId });

      await apply(page, 'ko', [email], 'guest');
      await expect(status(page)).toHaveText(t.done.guest(1));
      await expect(rowOf(page, email).locator('[data-col="role"]')).toContainText(t.roles.guest);
      expect((await roleRow(id)).role).toBe('guest');

      await expectNoHorizontalScroll(page);
      await expectAccessible(page);
    } finally {
      await deleteAccount(email);
    }
  });

  test('changes several people at once', async ({ page, baseURL }, testInfo) => {
    const t = COPY.ko;
    const emails = [
      newAddress(testInfo, 'a'),
      newAddress(testInfo, 'b'),
      newAddress(testInfo, 'c'),
    ];
    try {
      const ids = await Promise.all(emails.map((email) => createOnboardedAccount(email)));
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, 'ko', { q: `-${testInfo.project.name}-` });
      await apply(page, 'ko', emails, 'member');
      await expect(status(page)).toHaveText(t.done.member(3));
      for (const id of ids) expect((await roleRow(id)).role).toBe('member');
    } finally {
      for (const email of emails) await deleteAccount(email);
    }
  });

  test('refuses a crafted request for a role an operator may not give', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    try {
      const id = await createOnboardedAccount(email, { names: ['정', '시험'] });
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, 'ko', { q: email });

      // The operator's form has no such button. Someone with the developer tools open adds one.
      for (const to of ['operator', 'admin']) {
        await tickOf(page, email).check();
        await page.evaluate((role) => {
          const form = document.querySelector('main form[data-members-form]')!;
          const crafted = document.createElement('button');
          crafted.type = 'submit';
          crafted.name = 'to';
          crafted.value = role;
          crafted.id = 'crafted';
          crafted.textContent = role;
          form.append(crafted);
        }, to);
        await page.locator('#crafted').click();

        await expect(alert(page)).toContainText(t.refusedRole);
        // What is wrong and what to do about it, in the person's own words.
        await expect(alert(page)).toContainText(t.reason.authorityRole('정시험 님'));
        // The person stays ticked, so the operator can see who was meant.
        await expect(tickOf(page, email)).toBeChecked();
        await expect(status(page)).toHaveText('');
        expect((await roleRow(id)).role, to).toBe('guest');
        await page.evaluate(() => document.querySelector('#crafted')?.remove());
      }

      await expectNoHorizontalScroll(page);
      await expectAccessible(page);
    } finally {
      await deleteAccount(email);
    }
  });

  test('refuses a crafted request that names staff or an admin, and then changes nobody', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    try {
      const guestId = await createOnboardedAccount(email, { names: ['정', '시험'] });
      const adminId = await accountId(SEEDED.admin);
      const operatorId = await accountId(SEEDED.operator);
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, 'ko', { q: email });

      // Rows the operator cannot change cannot be ticked, so somebody else is added to the form by
      // hand: a request nobody can make from the screen.
      const add = (id: string) =>
        page.evaluate((value) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = 'id';
          input.value = value;
          document.querySelector('main form[data-members-form]')!.append(input);
        }, id);

      // The guest alone could become a member; with the admin in the batch, the whole batch is
      // refused, and the admin is named.
      await tickOf(page, email).check();
      await add(adminId);
      await button(page, 'ko', 'member', 1).click();
      await expect(alert(page)).toContainText(t.refusedRole);
      await expect(alert(page)).toContainText(t.reason.authorityRole(`${t.adminName} 님`));
      expect((await roleRow(adminId)).role).toBe('admin');
      expect((await roleRow(guestId)).role).toBe('guest');

      // Blocking an admin or another operator is refused the same way, the guest included.
      for (const other of [adminId, operatorId]) {
        await page.reload();
        await hydrated(page);
        await tickOf(page, email).check();
        await add(other);
        await button(page, 'ko', 'block', 1).click();
        await expect(alert(page)).toContainText(t.refusedBlock);
        // The admin is out of the operator's reach; the operator in the form is themselves.
        await expect(alert(page)).toContainText(
          other === adminId
            ? t.reason.authorityBlock(`${t.adminName} 님`)
            : t.reason.self(`${t.operatorName} 님`),
        );
        expect((await roleRow(other)).blocked_at).toBeNull();
        expect((await roleRow(guestId)).blocked_at).toBeNull();
      }
      expect(await bannedUntil(adminId)).toBeNull();
      expect(await bannedUntil(guestId)).toBeNull();
    } finally {
      await deleteAccount(email);
    }
  });

  test('refuses a request that is not a list of accounts, and one that changes nothing', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    try {
      const id = await createOnboardedAccount(email);
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, 'ko', { q: email });

      // An id that is not an id.
      await tickOf(page, email).check();
      await page.evaluate(() => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'id';
        input.value = "x'; delete from user_roles; --";
        document.querySelector('main form[data-members-form]')!.append(input);
      });
      await button(page, 'ko', 'member', 1).click();
      await expect(alert(page)).toBeVisible();
      expect((await roleRow(id)).role).toBe('guest');

      // Somebody who is no longer there.
      await page.reload();
      await hydrated(page);
      await tickOf(page, email).check();
      await page.evaluate(() => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'id';
        input.value = '5eed0000-0000-4000-8000-0000000000ff';
        document.querySelector('main form[data-members-form]')!.append(input);
      });
      await button(page, 'ko', 'member', 1).click();
      await expect(alert(page)).toBeVisible();
      expect((await roleRow(id)).role).toBe('guest');

      // The person is already a member: that is not a change, so the batch is refused by name.
      await page.reload();
      await hydrated(page);
      await apply(page, 'ko', [email], 'member');
      await expect(status(page)).toHaveText(t.done.member(1));
      await apply(page, 'ko', [email], 'member');
      await expect(alert(page)).toContainText(t.refusedRole);
    } finally {
      await deleteAccount(email);
    }
  });

  test('works with the page’s scripts switched off', async ({ browser, baseURL }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    try {
      const id = await createOnboardedAccount(email);
      const page = await context.newPage();
      await page.goto(await requestSignInLink(SEEDED.operator, baseURL!));
      await openList(page, 'ko', { q: email }, { scripts: false });

      // Nothing ticked: the form posts, and the page comes back with the answer.
      await button(page, 'ko', 'member').click();
      await expect(alert(page)).toHaveText(t.chooseFirst);
      expect((await roleRow(id)).role).toBe('guest');

      await tickOf(page, email).check();
      await button(page, 'ko', 'member').click();
      await expect(status(page)).toHaveText(t.done.member(1));
      await expect(rowOf(page, email).locator('[data-col="role"]')).toContainText(t.roles.member);
      expect((await roleRow(id)).role).toBe('member');
    } finally {
      await context.close();
      await deleteAccount(email);
    }
  });
});

test.describe('blocking', () => {
  test('ends the account’s access at once and keeps it out until it is unblocked', async ({
    browser,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    let operator: BrowserContext | undefined;
    let member: BrowserContext | undefined;
    try {
      const id = await createOnboardedAccount(email, { role: 'member' });
      const them = await signedInPage(browser, baseURL!, email);
      member = them.context;
      await them.page.goto('/ko/me');
      await expect(them.page).toHaveURL(`${baseURL}/ko/me`);

      const staff = await signedInPage(browser, baseURL!, SEEDED.operator);
      operator = staff.context;
      await openList(staff.page, 'ko', { q: email });
      await apply(staff.page, 'ko', [email], 'block');
      await expect(status(staff.page)).toHaveText(t.done.block(1));
      await expect(rowOf(staff.page, email).locator('[data-col="role"]')).toContainText(t.blocked);
      const blocked = await roleRow(id);
      expect(blocked.blocked_at).not.toBeNull();
      expect(blocked.updated_by).toBe(await accountId(SEEDED.operator));
      // Auth refuses it too, not only the site.
      expect(await bannedUntil(id)).not.toBeNull();

      // Their next visit, with the session they already had, ends at the sign-in page.
      await them.page.goto('/ko/me');
      await expect(them.page).toHaveURL(`${baseURL}/ko/login?error=blocked`);

      // A fresh sign-in attempt fails as well: the emailed link no longer signs anyone in, and the
      // login page says why (not that the link expired).
      const fresh = await member.newPage();
      await fresh.goto(await requestSignInLink(email, baseURL!));
      await expect(fresh).toHaveURL(`${baseURL}/ko/login?error=blocked`);
      await expect(alert(fresh)).toHaveText(t.blockedNotice);
      await fresh.goto('/ko/me');
      await expect(fresh).toHaveURL(/\/ko\/login/);

      // Unblocking lets them back in.
      await apply(staff.page, 'ko', [email], 'unblock');
      await expect(status(staff.page)).toHaveText(t.done.unblock(1));
      await expect(rowOf(staff.page, email).locator('[data-col="role"]')).not.toContainText(
        t.blocked,
      );
      expect((await roleRow(id)).blocked_at).toBeNull();
      expect(await bannedUntil(id)).toBeNull();

      const back = await member.newPage();
      await back.goto(await requestSignInLink(email, baseURL!));
      await expect(back).toHaveURL(`${baseURL}/ko`);
      await back.goto('/ko/me');
      await expect(back).toHaveURL(`${baseURL}/ko/me`);
    } finally {
      await operator?.close();
      await member?.close();
      await deleteAccount(email);
    }
  });
});

test.describe('the list as an admin', () => {
  for (const locale of ['ko', 'en'] as const) {
    test(`has every button and can tick every row (${locale})`, async ({ page, baseURL }) => {
      const t = COPY[locale];
      await signIn(page, SEEDED.admin, baseURL!);
      await openList(page, locale);
      for (const name of ['member', 'guest', 'operator', 'admin', 'block', 'unblock'] as const) {
        await expect(button(page, locale, name)).toBeVisible();
      }
      for (const email of Object.values(SEEDED)) {
        await expect(tickOf(page, email)).toBeEnabled();
      }
      await expect(page.getByRole('heading', { level: 1, name: t.title })).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectAccessible(page);
    });
  }

  test('makes a member an operator and an admin, and takes the role away again', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    try {
      const id = await createOnboardedAccount(email, { role: 'member' });
      const adminId = await accountId(SEEDED.admin);
      await signIn(page, SEEDED.admin, baseURL!);
      await openList(page, 'ko', { q: email });

      await apply(page, 'ko', [email], 'operator');
      await expect(status(page)).toHaveText(t.done.operator(1));
      await expect(rowOf(page, email).locator('[data-col="role"]')).toContainText(t.roles.operator);
      expect(await roleRow(id)).toMatchObject({ role: 'operator', updated_by: adminId });

      await apply(page, 'ko', [email], 'admin');
      await expect(status(page)).toHaveText(t.done.admin(1));
      expect((await roleRow(id)).role).toBe('admin');

      // Another admin stays, so this one can be taken down (after the question: they lose a staff
      // role).
      await apply(page, 'ko', [email], 'member', { asks: true });
      await expect(status(page)).toHaveText(t.done.member(1));
      expect((await roleRow(id)).role).toBe('member');
    } finally {
      await deleteAccount(email);
    }
  });

  test('an operator the admin demotes gets the 404 on the next load, token or not', async ({
    browser,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    let operator: BrowserContext | undefined;
    let admin: BrowserContext | undefined;
    try {
      const id = await createOnboardedAccount(email, { role: 'operator' });
      const staff = await signedInPage(browser, baseURL!, email);
      operator = staff.context;
      await openList(staff.page, 'ko', { q: email });
      await expect(rowOf(staff.page, email)).toBeVisible();

      const boss = await signedInPage(browser, baseURL!, SEEDED.admin);
      admin = boss.context;
      await openList(boss.page, 'ko', { q: email });
      await apply(boss.page, 'ko', [email], 'member', { asks: true });
      await expect(status(boss.page)).toHaveText(t.done.member(1));
      expect((await roleRow(id)).role).toBe('member');

      // Their token still says operator for up to an hour; the database says member.
      const response = await staff.page.reload();
      expect(response?.status()).toBe(404);
      await expect(staff.page.locator('main form[data-members-form]')).toHaveCount(0);
    } finally {
      await operator?.close();
      await admin?.close();
      await deleteAccount(email);
    }
  });
});

test.describe('the site is never left without an admin', () => {
  // These tests need exactly one admin who can sign in. They do not use the seeded admin for it: a
  // new admin is made, and the seeded one is blocked for the length of the test and let back in
  // afterwards (the site counts a blocked admin as no admin). So if a rule below ever fails, the
  // account it takes away is the throwaway one, not the one the rest of the suite signs in as.
  async function asTheOnlyAdmin(
    testInfo: TestInfo,
    run: (email: string, id: string) => Promise<void>,
  ) {
    const email = newAddress(testInfo, 'sole');
    const seeded = await accountId(SEEDED.admin);
    const id = await createOnboardedAccount(email, { role: 'admin', names: ['단', '독'] });
    await adminClient()
      .from('user_roles')
      .update({ blocked_at: new Date().toISOString() })
      .eq('user_id', seeded);
    try {
      await run(email, id);
    } finally {
      await adminClient().from('user_roles').update({ blocked_at: null }).eq('user_id', seeded);
      await deleteAccount(email);
    }
  }

  test('the only admin cannot demote themselves, and nothing changes', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    await asTheOnlyAdmin(testInfo, async (email, id) => {
      await signIn(page, email, baseURL!);
      await openList(page, 'ko', { q: email });

      for (const name of ['member', 'guest', 'operator'] as const) {
        await tickOf(page, email).check();
        await button(page, 'ko', name, 1).click();
        await expect(alert(page)).toHaveText(t.lastAdmin);
        expect((await roleRow(id)).role, name).toBe('admin');
      }
      await expectNoHorizontalScroll(page);
      await expectAccessible(page);
    });
  });

  test('a blocked admin does not count: demoting the other one is refused too', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    await asTheOnlyAdmin(testInfo, async (email, id) => {
      await signIn(page, email, baseURL!);
      // The seeded admin is blocked right now, so the only admin who can sign in is this one,
      // however many admins the list shows.
      await openList(page, 'ko', { q: 'example.test', role: 'admin' });
      await expect(rowOf(page, SEEDED.admin)).toBeVisible();
      await tickOf(page, email).check();
      await button(page, 'ko', 'guest', 1).click();
      await expect(alert(page)).toHaveText(t.lastAdmin);
      expect((await roleRow(id)).role).toBe('admin');
    });
  });

  test('the only admin cannot block themselves', async ({ page, baseURL }, testInfo) => {
    const t = COPY.ko;
    await asTheOnlyAdmin(testInfo, async (email, id) => {
      await signIn(page, email, baseURL!);
      await openList(page, 'ko', { q: email });
      await tickOf(page, email).check();
      await button(page, 'ko', 'block', 1).click();
      await expect(alert(page)).toContainText(t.refusedBlock);
      await expect(alert(page)).toContainText(t.reason.self('단독 님'));
      expect((await roleRow(id)).blocked_at).toBeNull();
      expect(await bannedUntil(id)).toBeNull();
    });
  });

  for (const locale of ['ko', 'en'] as const) {
    test(`the only admin cannot delete their own account (${locale})`, async ({
      page,
      baseURL,
    }, testInfo) => {
      const t = COPY[locale];
      await asTheOnlyAdmin(testInfo, async (email, id) => {
        await signIn(page, email, baseURL!);
        await page.goto(`/${locale}/me`);
        await page.locator('main summary', { hasText: t.deleteSummary }).click();
        await page.getByLabel(t.deletePrompt).fill(t.deleteWord);
        await page.getByRole('button', { name: t.deleteSubmit }).click();

        await expect(page.locator('main').getByRole('alert')).toHaveText(t.lastAdminDelete);
        await expect(page).toHaveURL(`${baseURL}/${locale}/me`);
        const { data } = await adminClient().auth.admin.getUserById(id);
        expect(data.user).not.toBeNull();
        expect((await roleRow(id)).role).toBe('admin');
        await expectNoHorizontalScroll(page);
        await expectAccessible(page);
      });
    });
  }

  test('says the same in English', async ({ page, baseURL }, testInfo) => {
    const t = COPY.en;
    await asTheOnlyAdmin(testInfo, async (email) => {
      await signIn(page, email, baseURL!);
      await openList(page, 'en', { q: email });
      await tickOf(page, email).check();
      await button(page, 'en', 'member', 1).click();
      await expect(alert(page)).toHaveText(t.lastAdmin);
    });
  });

  test('a second admin can step down, and can delete their account, while another admin stays', async ({
    browser,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const stepDown = newAddress(testInfo, 'step');
    const leave = newAddress(testInfo, 'leave');
    const contexts: BrowserContext[] = [];
    try {
      // (The seeded admin is the one who stays.)
      const stepId = await createOnboardedAccount(stepDown, { role: 'admin' });
      const leaveId = await createOnboardedAccount(leave, { role: 'admin' });

      // The first demotes themselves. The question says so, since it ends their own access.
      const one = await signedInPage(browser, baseURL!, stepDown);
      contexts.push(one.context);
      await openList(one.page, 'ko', { q: stepDown });
      await apply(one.page, 'ko', [stepDown], 'member', { confirm: false, asks: true });
      const asked = question(one.page, 'ko', 'member', 1);
      await expect(asked).toBeVisible();
      await expect(asked).toContainText(t.confirm.staffLoss(1));
      await expect(asked).toContainText(t.confirm.selfLoss);
      await expect(asked).toHaveAccessibleDescription(
        `${t.confirm.staffLoss(1)} ${t.confirm.selfLoss}`,
      );
      expect((await roleRow(stepId)).role).toBe('admin');
      await confirmButton(one.page, 'ko', 'member').click();
      // Their members screen is gone with the role, so they are taken to My page, which says so.
      await expect(one.page).toHaveURL(`${baseURL}/ko/me`);
      await expect(
        one.page.locator('main').getByText(t.roles.member, { exact: true }),
      ).toBeVisible();
      expect((await roleRow(stepId)).role).toBe('member');
      expect((await one.page.goto('/ko/admin/members'))?.status()).toBe(404);

      // The second deletes the account.
      const two = await signedInPage(browser, baseURL!, leave);
      contexts.push(two.context);
      await two.page.goto('/ko/me');
      await two.page.locator('main summary', { hasText: t.deleteSummary }).click();
      await two.page.getByLabel(t.deletePrompt).fill(t.deleteWord);
      await two.page.getByRole('button', { name: t.deleteSubmit }).click();
      await expect(two.page).toHaveURL(`${baseURL}/ko?deleted=1`);
      const { data } = await adminClient().auth.admin.getUserById(leaveId);
      expect(data.user).toBeNull();
    } finally {
      for (const context of contexts) await context.close();
      await deleteAccount(stepDown);
      await deleteAccount(leave);
    }
  });
});

// ---------------------------------------------------------------------------
// Asking before the changes that matter, saying why when one is refused, and the strip at the
// bottom of a phone
// ---------------------------------------------------------------------------

test.describe('the buttons say how many, and wait for somebody', () => {
  for (const locale of ['ko', 'en'] as const) {
    test(`are disabled with nobody ticked and carry the count after (${locale})`, async ({
      page,
      baseURL,
    }, testInfo) => {
      const t = COPY[locale];
      const emails = [newAddress(testInfo, 'a'), newAddress(testInfo, 'b')];
      try {
        await Promise.all(emails.map((email) => createOnboardedAccount(email)));
        await signIn(page, SEEDED.admin, baseURL!);
        await openList(page, locale, { q: `-${testInfo.project.name}-` });

        const all = ['member', 'guest', 'operator', 'admin', 'block', 'unblock'] as const;
        // Nobody ticked: every button is there, dimmed and not pressable, under its plain name.
        for (const name of all) await expect(button(page, locale, name)).toBeDisabled();

        await tickOf(page, emails[0]).check();
        for (const name of all) await expect(button(page, locale, name, 1)).toBeEnabled();

        await tickOf(page, emails[1]).check();
        for (const name of all) await expect(button(page, locale, name, 2)).toBeEnabled();

        // And back to nobody.
        await tickOf(page, emails[0]).uncheck();
        await tickOf(page, emails[1]).uncheck();
        for (const name of all) await expect(button(page, locale, name)).toBeDisabled();
        await expect(table(page).getByText(t.selected(0))).toBeVisible();
      } finally {
        for (const email of emails) await deleteAccount(email);
      }
    });
  }
});

test.describe('asking before a change that matters', () => {
  test('blocking asks in the same place, and cancelling or Escape changes nothing', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    try {
      const id = await createOnboardedAccount(email, { role: 'member' });
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, 'ko', { q: email });
      await tickOf(page, email).check();

      // The button turns the row into the question; the role buttons are gone from it, and the
      // focus is on the answer that does the thing.
      await button(page, 'ko', 'block', 1).click();
      await expect(question(page, 'ko', 'block', 1)).toBeVisible();
      await expect(confirmButton(page, 'ko', 'block')).toBeFocused();
      await expect(cancelButton(page, 'ko')).toBeVisible();
      await expect(button(page, 'ko', 'member', 1)).toHaveCount(0);
      await expect(alert(page)).toHaveCount(0);
      // Nothing has been done, and the person is still ticked.
      expect((await roleRow(id)).blocked_at).toBeNull();
      expect(await bannedUntil(id)).toBeNull();
      await expect(tickOf(page, email)).toBeChecked();
      await expectAccessible(page);

      // Escape says no: the buttons are back, the focus is on the one that asked.
      await page.keyboard.press('Escape');
      await expect(question(page, 'ko', 'block', 1)).toHaveCount(0);
      await expect(button(page, 'ko', 'block', 1)).toBeFocused();
      await expect(button(page, 'ko', 'member', 1)).toBeVisible();
      await expect(tickOf(page, email)).toBeChecked();
      expect((await roleRow(id)).blocked_at).toBeNull();

      // So does the cancel button.
      await button(page, 'ko', 'block', 1).click();
      await cancelButton(page, 'ko').click();
      await expect(question(page, 'ko', 'block', 1)).toHaveCount(0);
      await expect(button(page, 'ko', 'block', 1)).toBeFocused();
      expect((await roleRow(id)).blocked_at).toBeNull();

      // Saying yes does it.
      await button(page, 'ko', 'block', 1).click();
      await confirmButton(page, 'ko', 'block').click();
      await expect(status(page)).toHaveText(t.done.block(1));
      await expect(question(page, 'ko', 'block', 1)).toHaveCount(0);
      expect((await roleRow(id)).blocked_at).not.toBeNull();
      expect(await bannedUntil(id)).not.toBeNull();
      await expectNoHorizontalScroll(page);
    } finally {
      await deleteAccount(email);
    }
  });

  test('unblocking, members and guests are one click', async ({ page, baseURL }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    try {
      const id = await createOnboardedAccount(email);
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, 'ko', { q: email });
      await apply(page, 'ko', [email], 'member', { confirm: false });
      await expect(status(page)).toHaveText(t.done.member(1));
      await tickOf(page, email).check();
      await button(page, 'ko', 'guest', 1).click();
      await expect(status(page)).toHaveText(t.done.guest(1));

      await apply(page, 'ko', [email], 'block');
      await expect(status(page)).toHaveText(t.done.block(1));
      await tickOf(page, email).check();
      await button(page, 'ko', 'unblock', 1).click();
      await expect(status(page)).toHaveText(t.done.unblock(1));
      await expect(table(page).getByRole('group', { name: /\?$/ })).toHaveCount(0);
      expect((await roleRow(id)).blocked_at).toBeNull();
    } finally {
      await deleteAccount(email);
    }
  });

  for (const locale of ['ko', 'en'] as const) {
    test(`making an operator or an admin asks first (${locale})`, async ({
      page,
      baseURL,
    }, testInfo) => {
      const t = COPY[locale];
      const email = newAddress(testInfo);
      try {
        const id = await createOnboardedAccount(email, { role: 'member' });
        await signIn(page, SEEDED.admin, baseURL!);
        await openList(page, locale, { q: email });

        for (const name of ['operator', 'admin'] as const) {
          await tickOf(page, email).check();
          await button(page, locale, name, 1).click();
          await expect(question(page, locale, name, 1)).toBeVisible();
          await expect(confirmButton(page, locale, name)).toBeFocused();
          expect((await roleRow(id)).role).toBe('member');
          await cancelButton(page, locale).click();
          await expect(button(page, locale, name, 1)).toBeFocused();
          expect((await roleRow(id)).role).toBe('member');
        }

        await button(page, locale, 'admin', 1).click();
        await confirmButton(page, locale, 'admin').click();
        await expect(status(page)).toHaveText(t.done.admin(1));
        expect((await roleRow(id)).role).toBe('admin');
        await expectAccessible(page);
      } finally {
        await deleteAccount(email);
      }
    });
  }

  for (const locale of ['ko', 'en'] as const) {
    test(`taking staff below operator asks first and says who loses a role (${locale})`, async ({
      page,
      baseURL,
    }, testInfo) => {
      const t = COPY[locale];
      const staff = newAddress(testInfo, 'op');
      const guest = newAddress(testInfo, 'g');
      try {
        const staffId = await createOnboardedAccount(staff, { role: 'operator' });
        const guestId = await createOnboardedAccount(guest);
        await signIn(page, SEEDED.admin, baseURL!);
        await openList(page, locale, { q: `-${testInfo.project.name}-` });

        // An operator and a guest, both to member: the operator would lose the staff role.
        await tickOf(page, staff).check();
        await tickOf(page, guest).check();
        await button(page, locale, 'member', 2).click();
        const asked = question(page, locale, 'member', 2);
        await expect(asked).toBeVisible();
        await expect(asked).toContainText(t.confirm.staffLoss(1));
        await expect(asked).not.toContainText(t.confirm.selfLoss);
        await expect(asked).toHaveAccessibleDescription(t.confirm.staffLoss(1));
        await expect(confirmButton(page, locale, 'member')).toBeFocused();
        await expectAccessible(page);
        expect((await roleRow(staffId)).role).toBe('operator');
        expect((await roleRow(guestId)).role).toBe('guest');

        // No: nothing changes, and the focus is back on the button that asked.
        await cancelButton(page, locale).click();
        await expect(asked).toHaveCount(0);
        await expect(button(page, locale, 'member', 2)).toBeFocused();
        expect((await roleRow(staffId)).role).toBe('operator');

        // Yes: both are members.
        await button(page, locale, 'member', 2).click();
        await confirmButton(page, locale, 'member').click();
        await expect(status(page)).toHaveText(t.done.member(2));
        expect((await roleRow(staffId)).role).toBe('member');
        expect((await roleRow(guestId)).role).toBe('member');

        // Two people who are not staff (any more): one click, no question.
        await apply(page, locale, [staff, guest], 'guest', { asks: false });
        await expect(status(page)).toHaveText(t.done.guest(2));
        expect((await roleRow(staffId)).role).toBe('guest');
      } finally {
        await deleteAccount(staff);
        await deleteAccount(guest);
      }
    });
  }

  test('changing who is ticked takes the question back', async ({ page, baseURL }, testInfo) => {
    const emails = [newAddress(testInfo, 'a'), newAddress(testInfo, 'b')];
    try {
      await Promise.all(emails.map((email) => createOnboardedAccount(email)));
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, 'ko', { q: `-${testInfo.project.name}-` });
      await tickOf(page, emails[0]).check();
      await button(page, 'ko', 'block', 1).click();
      await expect(question(page, 'ko', 'block', 1)).toBeVisible();

      // The question was about one person; with another ticked it would be about two.
      await tickOf(page, emails[1]).check();
      await expect(question(page, 'ko', 'block', 1)).toHaveCount(0);
      await expect(button(page, 'ko', 'block', 2)).toBeVisible();
    } finally {
      for (const email of emails) await deleteAccount(email);
    }
  });

  test('refuses before it asks, so nobody confirms what cannot happen', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    try {
      await createOnboardedAccount(email, { names: ['정', '시험'] });
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, 'ko', { q: email });
      await tickOf(page, email).check();
      // The operator's form has no such button; this one is added by hand.
      await page.evaluate(() => {
        const crafted = document.createElement('button');
        crafted.type = 'submit';
        crafted.name = 'to';
        crafted.value = 'admin';
        crafted.id = 'crafted';
        crafted.textContent = 'admin';
        document.querySelector('main form[data-members-form]')!.append(crafted);
      });
      await page.locator('#crafted').click();
      await expect(alert(page)).toContainText(t.reason.authorityRole('정시험 님'));
      await expect(table(page).getByRole('group', { name: /\?$/ })).toHaveCount(0);
    } finally {
      await deleteAccount(email);
    }
  });

  test('works with the page’s scripts switched off, and the question cannot be skipped', async ({
    browser,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const email = newAddress(testInfo);
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
    try {
      const id = await createOnboardedAccount(email, { role: 'member' });
      const page = await context.newPage();
      await page.goto(await requestSignInLink(SEEDED.operator, baseURL!));
      await openList(page, 'ko', { q: email }, { scripts: false });

      // Without scripts the buttons cannot know who is ticked, so none of them is dimmed.
      await expect(button(page, 'ko', 'block')).toBeEnabled();

      // The click goes to the server, which answers with the question and does nothing.
      await tickOf(page, email).check();
      await button(page, 'ko', 'block').click();
      await expect(question(page, 'ko', 'block', 1)).toBeVisible();
      await expect(tickOf(page, email)).toBeChecked();
      expect((await roleRow(id)).blocked_at).toBeNull();
      expect(await bannedUntil(id)).toBeNull();

      // No: the form is shown as it was.
      await cancelButton(page, 'ko').click();
      await expect(question(page, 'ko', 'block', 1)).toHaveCount(0);
      await expect(button(page, 'ko', 'block')).toBeVisible();
      expect((await roleRow(id)).blocked_at).toBeNull();

      // Yes: it is done.
      await tickOf(page, email).check();
      await button(page, 'ko', 'block').click();
      await confirmButton(page, 'ko', 'block').click();
      await expect(status(page)).toHaveText(t.done.block(1));
      expect((await roleRow(id)).blocked_at).not.toBeNull();
    } finally {
      await context.close();
      await deleteAccount(email);
    }
  });
});

test.describe('saying why a change was refused', () => {
  for (const locale of ['ko', 'en'] as const) {
    test(`someone who already has the role is named with the reason (${locale})`, async ({
      page,
      baseURL,
    }, testInfo) => {
      const t = COPY[locale];
      const guest = newAddress(testInfo, 'g');
      const member = newAddress(testInfo, 'm');
      try {
        const guestId = await createOnboardedAccount(guest, { names: ['정', '시험'] });
        await createOnboardedAccount(member, { names: ['한', '회원'], role: 'member' });
        await signIn(page, SEEDED.admin, baseURL!);
        await openList(page, locale, { q: `-${testInfo.project.name}-` });
        await tickOf(page, guest).check();
        await tickOf(page, member).check();
        await button(page, locale, 'member', 2).click();

        const who = locale === 'ko' ? '한회원 님' : '회원 한';
        await expect(alert(page)).toContainText(t.refusedRole);
        await expect(alert(page)).toContainText(t.reason.same(who, t.roles.member));
        // Nothing in the batch was applied, the guest who could have been included; both stay
        // ticked, so it shows who was meant.
        expect((await roleRow(guestId)).role).toBe('guest');
        await expect(tickOf(page, guest)).toBeChecked();
        await expect(tickOf(page, member)).toBeChecked();
        await expectNoHorizontalScroll(page);
        await expectAccessible(page);
      } finally {
        await deleteAccount(guest);
        await deleteAccount(member);
      }
    });
  }

  test('says it once for each reason, the most serious first', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.ko;
    const member = newAddress(testInfo, 'm');
    try {
      await createOnboardedAccount(member, { names: ['한', '회원'], role: 'member' });
      const adminId = await accountId(SEEDED.admin);
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, 'ko', { q: member });
      await tickOf(page, member).check();
      // An admin the operator cannot tick is added by hand.
      await page.evaluate((value) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'id';
        input.value = value;
        document.querySelector('main form[data-members-form]')!.append(input);
      }, adminId);
      await button(page, 'ko', 'member', 1).click();

      const text = (await alert(page).innerText()).replace(/\s+/g, ' ');
      const first = text.indexOf(t.reason.authorityRole(`${t.adminName} 님`));
      const second = text.indexOf(t.reason.same('한회원 님', t.roles.member));
      expect(first).toBeGreaterThan(-1);
      expect(second).toBeGreaterThan(first);
      expect(text.startsWith(t.refusedRole)).toBe(true);
    } finally {
      await deleteAccount(member);
    }
  });

  test('says an admin cannot block themselves, in English too', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.en;
    const email = newAddress(testInfo, 'sole');
    try {
      await createOnboardedAccount(email, { role: 'admin', names: ['단', '독'] });
      await signIn(page, email, baseURL!);
      await openList(page, 'en', { q: email });
      await tickOf(page, email).check();
      await button(page, 'en', 'block', 1).click();
      await expect(alert(page)).toContainText(t.refusedBlock);
      await expect(alert(page)).toContainText(t.reason.self('독 단'));
      await expect(table(page).getByRole('group', { name: /\?$/ })).toHaveCount(0);
    } finally {
      await deleteAccount(email);
    }
  });

  test('an operator is told a crafted change is outside their authority, in English', async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = COPY.en;
    const email = newAddress(testInfo);
    try {
      await createOnboardedAccount(email, { names: ['정', '시험'] });
      const adminId = await accountId(SEEDED.admin);
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, 'en', { q: email });
      await tickOf(page, email).check();
      await page.evaluate((value) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'id';
        input.value = value;
        document.querySelector('main form[data-members-form]')!.append(input);
      }, adminId);
      await button(page, 'en', 'block', 1).click();
      await expect(alert(page)).toContainText(t.refusedBlock);
      await expect(alert(page)).toContainText(t.reason.authorityBlock(t.adminName));
    } finally {
      await deleteAccount(email);
    }
  });
});

test.describe('the width of the page', () => {
  test('lines up with the header at 1440, and fits at 1024', async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the width is a desktop matter');
    await signIn(page, SEEDED.operator, baseURL!);
    await openList(page, 'ko');

    const left = async (locator: Locator) => (await locator.boundingBox())!.x;
    const logo = page
      .locator('header')
      .getByRole('link', { name: /RISE CREW/ })
      .first();
    const edge = await left(logo);
    // The title and the table start where the logo does (to the pixel).
    expect(Math.abs((await left(page.getByRole('heading', { level: 1 }))) - edge)).toBeLessThan(
      1.5,
    );
    expect(Math.abs((await left(page.getByRole('table'))) - edge)).toBeLessThan(1.5);
    // And end where the header's content ends.
    const nav = page.locator('header nav').first();
    const navBox = (await nav.boundingBox())!;
    const tableBox = (await page.getByRole('table').boundingBox())!;
    expect(Math.abs(tableBox.x + tableBox.width - (navBox.x + navBox.width))).toBeLessThan(1.5);

    // The narrowest wide layout: every column inside the screen.
    await page.setViewportSize({ width: 1024, height: 800 });
    await expectNoHorizontalScroll(page);
    const last = page.getByRole('columnheader').last();
    const box = (await last.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(1024);
    await expectAccessible(page);
  });
});

test.describe('the strip of buttons on a phone', () => {
  test('stays in view once somebody is ticked, and does not hide the last row', async ({
    page,
    baseURL,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'the strip floats on a phone only');
    const t = COPY.ko;
    const emails = Array.from({ length: 6 }, (_, i) => newAddress(testInfo, `p${i}`));
    try {
      await Promise.all(emails.map((email) => createOnboardedAccount(email)));
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, 'ko', { q: `-${testInfo.project.name}-` });
      const height = page.viewportSize()!.height;
      const inView = async () => {
        const box = (await actionBar(page).boundingBox())!;
        return box.y >= 0 && box.y + box.height <= height + 0.5;
      };

      // Nobody ticked: the buttons are after the whole list, off the screen.
      expect(await inView()).toBe(false);
      await expect(actionBar(page)).toHaveCSS('position', 'static');

      // Tick the first person at the top of the list: the strip is on the screen without any
      // scrolling, says how many, and has the buttons.
      await page.locator('main tbody tr').first().getByRole('checkbox').check();
      await expect(actionBar(page)).toHaveCSS('position', 'sticky');
      // (The people were made at the same moment, so which of the six is first is not known.)
      expect(await page.evaluate(() => window.scrollY)).toBeLessThan(height / 2);
      expect(await inView()).toBe(true);
      await expect(actionBar(page).getByText(t.selected(1))).toBeVisible();
      await expect(button(page, 'ko', 'block', 1)).toBeInViewport({ ratio: 1 });

      // The question opens inside it, and is in view too.
      await button(page, 'ko', 'block', 1).click();
      await expect(question(page, 'ko', 'block', 1)).toBeInViewport({ ratio: 1 });
      await expect(confirmButton(page, 'ko', 'block')).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(button(page, 'ko', 'block', 1)).toBeFocused();

      // A change that went through leaves its answer in view too, not at the foot of the list, and
      // with nobody ticked any more the strip offers no buttons.
      await button(page, 'ko', 'member', 1).click();
      await expect(status(page)).toHaveText(t.done.member(1));
      await expect(status(page)).toBeInViewport({ ratio: 1 });
      expect(await inView()).toBe(true);
      await expect(button(page, 'ko', 'member')).toBeHidden();
      await page.locator('main tbody tr').nth(1).getByRole('checkbox').check();
      await expect(button(page, 'ko', 'member', 1)).toBeVisible();

      // A refusal is in view as well, next to the buttons that were pressed.
      await page.evaluate(() => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'id';
        input.value = '5eed0000-0000-4000-8000-0000000000ff';
        document.querySelector('main form[data-members-form]')!.append(input);
      });
      await button(page, 'ko', 'member', 1).click();
      await expect(alert(page)).toBeVisible();
      expect(await inView()).toBe(true);
      await expectAccessible(page);

      // At the very end it sits below the last row instead of over it.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const lastRow = (await page.locator('main tbody tr').last().boundingBox())!;
      const bar = (await actionBar(page).boundingBox())!;
      expect(bar.y).toBeGreaterThanOrEqual(lastRow.y + lastRow.height - 0.5);
      await expectNoHorizontalScroll(page);
    } finally {
      for (const email of emails) await deleteAccount(email);
    }
  });

  test('does not float on a wide screen', async ({ page, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the strip floats on a phone only');
    const email = newAddress(testInfo);
    try {
      await createOnboardedAccount(email);
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, 'ko', { q: email });
      await tickOf(page, email).check();
      await expect(actionBar(page)).toHaveCSS('position', 'static');
    } finally {
      await deleteAccount(email);
    }
  });
});

test.describe('pages of 50', () => {
  test('shows 50 rows a page and links to the next', async ({ page, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'the paging does not depend on the screen');
    test.setTimeout(120_000);
    const t = COPY.ko;
    const stamp = `${Date.now()}`;
    const emails = Array.from({ length: 52 }, (_, i) => `pg${stamp}-${i}@example.test`);
    try {
      // 52 finished sign-ups (the list shows no other kind), found by the stamp in their address.
      for (let i = 0; i < emails.length; i += 13) {
        await Promise.all(emails.slice(i, i + 13).map((email) => createOnboardedAccount(email)));
      }
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, 'ko', { q: `pg${stamp}` });
      await expect(page.locator('main tbody tr')).toHaveCount(50);
      await expect(page.locator('main').getByText('52', { exact: false }).first()).toBeVisible();
      await expect(page.locator('main nav').getByRole('link', { name: t.previous })).toHaveCount(0);

      await page.locator('main nav').getByRole('link', { name: t.next }).click();
      await expect(page).toHaveURL(/page=2/);
      await expect(page.locator('main tbody tr')).toHaveCount(2);
      await expect(page.locator('main nav').getByRole('link', { name: t.previous })).toBeVisible();
      await expect(page.locator('main nav').getByRole('link', { name: t.next })).toHaveCount(0);

      // Past the end: the last page, not an empty one.
      await page.goto(`/ko/admin/members?q=pg${stamp}&page=99`);
      await expect(page.locator('main tbody tr')).toHaveCount(2);
    } finally {
      for (const email of emails) await deleteAccount(email);
    }
  });
});

test.describe('long text', () => {
  test('a long name and address stay inside the screen', async ({ page, baseURL }, testInfo) => {
    const email = `very-long-address-${'x'.repeat(40)}-${testInfo.project.name}-${Date.now()}@example.test`;
    try {
      await createOnboardedAccount(email, { names: ['라이즈'.repeat(5), '크루'.repeat(10)] });
      await signIn(page, SEEDED.operator, baseURL!);
      await openList(page, 'ko', { q: email });
      await expect(rowOf(page, email)).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectAccessible(page);
    } finally {
      await deleteAccount(email);
    }
  });
});
