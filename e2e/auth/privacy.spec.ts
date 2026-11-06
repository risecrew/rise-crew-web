import { expect, test } from '@playwright/test';
import { PRIVACY_POLICY_VERSION } from '@/lib/auth/profile';
import {
  collectConsoleErrors,
  expectAccessible,
  expectNoHorizontalScroll,
  LOCALES,
  PAGES,
} from '../helpers';

// The privacy policy opens together with the accounts: with the switch off it is a 404 and the
// footer has no link to it (e2e/auth-off.spec.ts). It stays out of the sitemap (e2e/seo.spec.ts).
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
      '보유 기간과 파기',
      '처리를 맡기는 곳',
      '개인정보의 국외 이전',
      '열람할 수 있는 사람',
      '이용자의 권리',
      '만 14세 미만',
      '개인정보의 안전성 확보 조치',
      '개인정보 보호책임자',
      '시행일과 버전',
    ],
    notCollected: /전화번호와 학번은 받지 않습니다/,
    footerLink: '개인정보 처리방침',
    // The account emails go out through the club's Gmail account, so Google is more than the
    // Google sign-in button.
    googleSender: /Gmail 계정이 가입 확인과 비밀번호 재설정 메일을 보냅니다/,
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
    // Supabase's own sign-in logs name the account, and whoever runs the site can read every
    // account in the Supabase dashboard, which can also export tables.
    signInLogs: /로그인 기록에는 계정 이메일과 계정 식별자도 포함됩니다/,
    adminRow: '웹사이트 관리자',
    adminDashboard: /Supabase 관리 화면에서 모든 계정/,
    noExport: /회원 관리 화면에는 명단을 파일로 내려받는 기능이 없습니다/,
    destroy: /데이터베이스에서 삭제하는 방법으로 파기합니다/,
    // The database and the site's server functions are in Seoul (Vercel icn1); Vercel is a US company.
    transferDatabase: /데이터베이스는 대한민국\(서울\)에 있지만/,
    transferServer: /대한민국 \(웹사이트 서버가 실행되는 지역, 서울\)/,
    transferRefuse: /국외 이전을 원하지 않으면/,
    noPasswords: /비밀번호는 해시로만 저장하고 메일로 보내지 않습니다/,
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
      'How long we keep it, and how we destroy it',
      'Who processes it for us',
      'Transfers outside South Korea',
      'Who can see it',
      'Your rights',
      'People under 14',
      'How we keep it safe',
      'Privacy officer',
      'Effective date and version',
    ],
    notCollected: /We do not collect phone numbers or student IDs/,
    footerLink: 'Privacy policy',
    googleSender: /Gmail account sends sign-up confirmation and password reset emails/,
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
    signInLogs: /sign-in logs also include your account email and account identifier/,
    adminRow: 'Website administrator',
    adminDashboard: /every account in the Supabase dashboard/,
    noExport: /member management screen has no way to download the member list/,
    destroy: /destroy it by deleting it from the database/,
    transferDatabase: /The database that stores sign-up information is in South Korea \(Seoul\)/,
    transferServer: /South Korea \(where the website’s server runs, Seoul\)/,
    transferRefuse: /If you do not want this transfer/,
    noPasswords: /Passwords are stored only as hashes and are never emailed/,
  },
} as const;

for (const locale of LOCALES) {
  const copy = POLICY[locale];

  test(`/${locale}/privacy renders cleanly`, async ({ page }) => {
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

  test(`/${locale}/privacy says who else can read accounts, outside the member screen`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/privacy`);
    const main = page.locator('main');
    await expect(main.locator('section[aria-labelledby="privacy-items"]')).toContainText(
      copy.signInLogs,
    );
    const visibility = main.locator('section[aria-labelledby="privacy-visibility"]');
    const admin = visibility
      .locator('dl > div')
      .filter({ has: page.locator('dt', { hasText: copy.adminRow }) });
    await expect(admin).toHaveCount(1);
    await expect(admin).toContainText(copy.adminDashboard);
    await expect(visibility).toContainText(copy.noExport);
  });

  test(`/${locale}/privacy covers destruction, transfers abroad and safety measures`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/privacy`);
    const main = page.locator('main');
    await expect(main.locator('section[aria-labelledby="privacy-retention"]')).toContainText(
      copy.destroy,
    );
    const transfer = main.locator('section[aria-labelledby="privacy-transfer"]');
    await expect(transfer).toContainText(copy.transferDatabase);
    await expect(transfer).toContainText(copy.transferServer);
    await expect(transfer).toContainText(copy.transferRefuse);
    for (const name of ['Supabase Pte. Ltd.', 'Vercel Inc.', 'Google LLC']) {
      await expect(transfer.locator('dt', { hasText: name })).toHaveCount(1);
    }
    await expect(main.locator('section[aria-labelledby="privacy-security"]')).toContainText(
      copy.noPasswords,
    );
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
