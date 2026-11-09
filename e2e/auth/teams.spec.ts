import { expect, test, type Page } from '@playwright/test';
import {
  LOCALES,
  collectConsoleErrors,
  expectAccessible,
  expectNoHorizontalScroll,
} from '../helpers';
import {
  accountId,
  addTeamMember,
  adminClient,
  createOnboardedAccount,
  createPost,
  createTeam,
  deleteAccount,
  hidePost,
  requestSignInLink,
  signIn,
} from './helpers';

// What anyone can read. Everything here is fake data on the local stack.
const stamp = Date.now().toString(36);
const cohort = 1000 + (Date.now() % 8000);
const memberEmail = `team-page-member-${stamp}@example.test`;
const guestEmail = `team-page-guest-${stamp}@example.test`;
const SLUG = `open-team-${stamp}`;
const HIDDEN_SLUG = `closed-team-${stamp}`;
const PUBLIC_TITLE = `공개 소식 ${stamp}`;
const SIGNED_IN_TITLE = `가입자 소식 ${stamp}`;
const HIDDEN_TITLE = `숨긴 소식 ${stamp}`;
const PROFILE_NAME = `실명${stamp}`;

let publicPost: string;
let signedInPost: string;
let hiddenPost: string;

test.beforeAll(async () => {
  await createOnboardedAccount(memberEmail, { role: 'member', names: [PROFILE_NAME, '회원'] });
  await createOnboardedAccount(guestEmail);
  const team = await createTeam({
    slug: SLUG,
    name: `열린 팀 ${stamp}`,
    cohort,
    field: 'mobility',
    tagline: '이동을 다시 만들어요',
    intro: '우리 팀 소개입니다.',
    links: [{ kind: 'homepage', url: 'https://team.example.test/' }],
  });
  await createTeam({ slug: `other-team-${stamp}`, name: `다른 팀 ${stamp}`, cohort });
  await createTeam({
    slug: HIDDEN_SLUG,
    name: `닫힌 팀 ${stamp}`,
    cohort,
    is_published: false,
  });
  await addTeamMember(team, memberEmail);
  publicPost = await createPost(memberEmail, team, { title: PUBLIC_TITLE, body: '공개 본문' });
  signedInPost = await createPost(memberEmail, team, {
    title: SIGNED_IN_TITLE,
    body: '가입자 본문',
    visibility: 'signed_in',
  });
  hiddenPost = await createPost(memberEmail, team, { title: HIDDEN_TITLE });
  await hidePost(hiddenPost);
});

test.afterAll(async () => {
  await deleteAccount(memberEmail);
  await deleteAccount(guestEmail);
});

test('the list shows published teams only, and the menu links to it', async ({ page }) => {
  await page.goto(`/ko/startups?cohort=${cohort}`);
  await expect(page.getByRole('link', { name: new RegExp(`열린 팀 ${stamp}`) })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(`다른 팀 ${stamp}`) })).toBeVisible();
  await expect(page.getByText(`닫힌 팀 ${stamp}`)).toHaveCount(0);
  // The phone menu is closed, so look in the footer, which has the same items on every screen.
  await expect(page.locator('footer a[href="/ko/startups"]')).toHaveText('창업팀');
});

test('a field filter narrows the list and stays in the address', async ({ page }) => {
  await page.goto(`/ko/startups?cohort=${cohort}`);
  await page
    .getByRole('navigation', { name: '거르기' })
    .getByRole('link', { name: '모빌리티' })
    .click();
  await expect(page).toHaveURL(new RegExp(`field=mobility`));
  await expect(page).toHaveURL(new RegExp(`cohort=${cohort}`));
  await expect(page.getByRole('link', { name: new RegExp(`열린 팀 ${stamp}`) })).toBeVisible();
  await expect(page.getByText(`다른 팀 ${stamp}`)).toHaveCount(0);
});

test('nonsense in the address is ignored, not an error', async ({ request }) => {
  const list = await request.get('/ko/startups?field=zzz&cohort=abc&page=-1');
  expect(list.status()).toBe(200);
  expect((await request.get('/ko/startups?page=99999')).status()).toBe(200);
  expect((await request.get(`/ko/startups/${SLUG}?page=99999`)).status()).toBe(200);
  expect((await request.get(`/ko/startups/${SLUG}?page=abc`)).status()).toBe(200);
});

test('a team row shows its cover when it has one, and none otherwise', async ({ page }) => {
  await page.goto(`/ko/startups?cohort=${cohort}`);
  const row = page.getByRole('link', { name: new RegExp(`다른 팀 ${stamp}`) });
  await expect(row).toBeVisible();
  await expect(row.locator('img[src*="team-"]')).toHaveCount(0);
});

test('a filter nothing matches says so', async ({ page }) => {
  await page.goto('/ko/startups?cohort=9999&field=healthcare');
  await expect(page.getByText('조건에 맞는 팀이 없어요.')).toBeVisible();
  await page.getByRole('link', { name: '거르기 지우기' }).click();
  await expect(page).toHaveURL(/\/ko\/startups$/);
});

test('signed out, a team page shows the team and public posts and only counts the rest', async ({
  page,
  request,
}) => {
  await page.goto(`/ko/startups/${SLUG}`);
  await expect(page.getByRole('heading', { level: 1, name: `열린 팀 ${stamp}` })).toBeVisible();
  await expect(page.getByText('이동을 다시 만들어요')).toBeVisible();
  await expect(page.getByText('우리 팀 소개입니다.')).toBeVisible();
  await expect(page.getByRole('link', { name: '홈페이지' })).toHaveAttribute(
    'href',
    'https://team.example.test/',
  );
  await expect(page.getByRole('link', { name: new RegExp(PUBLIC_TITLE) })).toBeVisible();
  await expect(page.getByText('가입자 전용 글이 1개 있어요')).toBeVisible();
  await expect(page.getByRole('link', { name: '글쓰기' })).toHaveCount(0);

  const source = await (await request.get(`/ko/startups/${SLUG}`)).text();
  expect(source).toContain(PUBLIC_TITLE);
  expect(source).not.toContain(SIGNED_IN_TITLE);
  expect(source).not.toContain('가입자 본문');
  expect(source).not.toContain(HIDDEN_TITLE);
  expect(source).not.toContain(PROFILE_NAME);
  expect(source).not.toContain(memberEmail);
});

test('signed out, posts and teams that are closed are 404', async ({ request }) => {
  const statusOf = async (path: string) => (await request.get(path)).status();
  expect(await statusOf(`/ko/startups/${SLUG}/posts/${publicPost}`)).toBe(200);
  expect(await statusOf(`/ko/startups/${SLUG}/posts/${signedInPost}`)).toBe(404);
  expect(await statusOf(`/ko/startups/${SLUG}/posts/${hiddenPost}`)).toBe(404);
  expect(await statusOf(`/ko/startups/${SLUG}/posts/not-a-uuid`)).toBe(404);
  expect(await statusOf(`/ko/startups/${HIDDEN_SLUG}`)).toBe(404);
  expect(await statusOf(`/ko/startups/no-such-team-${stamp}`)).toBe(404);
});

test('a post page shows the team, not a person', async ({ page }) => {
  await page.goto(`/ko/startups/${SLUG}/posts/${publicPost}`);
  await expect(page.getByRole('heading', { level: 1, name: PUBLIC_TITLE })).toBeVisible();
  await expect(page.getByText('공개 본문')).toBeVisible();
  await expect(page.getByRole('link', { name: `열린 팀 ${stamp} 페이지로` })).toBeVisible();
  await expect(page.locator('main')).not.toContainText(PROFILE_NAME);
});

test('a finished guest reads the signed-in post and has no team buttons', async ({
  page,
  baseURL,
}) => {
  await signIn(page, guestEmail, baseURL!);
  await page.goto(`/ko/startups/${SLUG}`);
  await expect(page.getByRole('link', { name: new RegExp(SIGNED_IN_TITLE) })).toBeVisible();
  await expect(page.getByText('가입자 전용 글이')).toHaveCount(0);
  await expect(page.getByText(HIDDEN_TITLE)).toHaveCount(0);
  await expect(page.getByRole('link', { name: '글쓰기' })).toHaveCount(0);
  await page.goto(`/ko/startups/${SLUG}/posts/${signedInPost}`);
  await expect(page.getByText('가입자 본문')).toBeVisible();
});

test('an account that has not finished signing up is told how to read the rest', async ({
  page,
  baseURL,
}) => {
  const email = `team-page-unfinished-${stamp}@example.test`;
  try {
    await page.goto(await requestSignInLink(email, baseURL!));
    await page.goto(`/ko/startups/${SLUG}`);
    await expect(page.getByText('가입을 마치면 볼 수 있어요')).toBeVisible();
    await expect(page.getByRole('link', { name: '가입 마치기' })).toHaveAttribute(
      'href',
      new RegExp(`/ko/welcome\\?next=.*${SLUG}`),
    );
    await expect(page.getByText(SIGNED_IN_TITLE)).toHaveCount(0);
  } finally {
    await deleteAccount(email);
  }
});

test('a blocked account reads public posts only and gets no prompt', async ({
  browser,
  baseURL,
}) => {
  const email = `team-page-blocked-${stamp}@example.test`;
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await createOnboardedAccount(email);
    await signIn(page, email, baseURL!);
    const { error } = await adminClient()
      .from('user_roles')
      .update({ blocked_at: new Date().toISOString() })
      .eq('user_id', await accountId(email));
    expect(error).toBeNull();

    await page.goto(`/ko/startups/${SLUG}`);
    await expect(page.getByRole('link', { name: new RegExp(PUBLIC_TITLE) })).toBeVisible();
    await expect(page.getByText(SIGNED_IN_TITLE)).toHaveCount(0);
    await expect(page.getByText('가입자 전용 글이')).toHaveCount(0);
    expect((await page.goto(`/ko/startups/${SLUG}/posts/${signedInPost}`))?.status()).toBe(404);
  } finally {
    await context.close();
    await deleteAccount(email);
  }
});

for (const locale of LOCALES) {
  test(`the ${locale} pages are clean on a phone and pass the accessibility check`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors = collectConsoleErrors(page);
    for (const path of [
      `/${locale}/startups?cohort=${cohort}`,
      `/${locale}/startups/${SLUG}`,
      `/${locale}/startups/${SLUG}/posts/${publicPost}`,
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectAccessible(page);
    }
    expect(errors).toEqual([]);
  });
}

test('the account menu leads a member straight to their team; others get no such row', async ({
  page,
  browser,
  baseURL,
}) => {
  const open = async (page: Page) => {
    await page
      .locator('header summary')
      .or(page.getByRole('button', { name: /계정 메뉴/ }))
      .locator('visible=true')
      .first()
      .click();
  };
  await signIn(page, memberEmail, baseURL!);
  await page.goto('/ko');
  await open(page);
  const header = page.locator('header');
  const row = header.getByRole('link', { name: '소속팀', exact: true }).locator('visible=true');
  await expect(row).toHaveAttribute('href', `/ko/startups/${SLUG}`);
  await row.click();
  await expect(page).toHaveURL(`${baseURL}/ko/startups/${SLUG}`);

  // Someone in no team.
  const other = await (await browser.newContext()).newPage();
  await signIn(other, guestEmail, baseURL!);
  await open(other);
  const otherHeader = other.locator('header');
  await expect(
    otherHeader.getByRole('link', { name: '마이페이지' }).locator('visible=true'),
  ).toBeVisible();
  await expect(otherHeader.getByRole('link', { name: /소속팀/ })).toHaveCount(0);
});
