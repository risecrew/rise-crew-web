import { expect, test, type TestInfo } from '@playwright/test';
import { collectConsoleErrors, expectAccessible, expectNoHorizontalScroll } from '../helpers';
import {
  addTeamMember,
  createOnboardedAccount,
  createPost,
  createTeam,
  deleteAccount,
  signIn,
} from './helpers';

// What operators do with teams. Fake data on the local stack.
const OPERATOR = 'operator@example.test';
const GUEST = 'guest@example.test';
const MEMBER = 'member@example.test';

let counter = 0;
const created: string[] = [];

function unique(testInfo: TestInfo): string {
  counter += 1;
  return `${Date.now().toString(36)}-${testInfo.parallelIndex}${counter}`;
}

test.afterAll(async () => {
  for (const email of created) await deleteAccount(email);
});

test('an operator creates a team, which stays off the list until it is published', async ({
  page,
  baseURL,
}, testInfo) => {
  const id = unique(testInfo);
  const cohort = 1000 + (Date.now() % 8000);
  await signIn(page, OPERATOR, baseURL!);
  await page.goto('/ko/admin/teams');
  await page.getByRole('link', { name: '팀 만들기' }).click();

  await page.getByLabel('팀 이름').fill(`새 팀 ${id}`);
  await page.getByLabel('분야').selectOption('edutech');
  await page.getByLabel('기수').fill(String(cohort));
  await page.getByRole('button', { name: '만들기' }).click();
  await expect(page.getByRole('heading', { level: 1, name: `새 팀 ${id}` })).toBeVisible();

  await page.goto(`/ko/startups?cohort=${cohort}`);
  await expect(page.getByText(`새 팀 ${id}`)).toHaveCount(0);
  // The address made itself, and the team's own page opens from the admin screen.
  await page.goto('/ko/admin/teams');
  await page.getByRole('link', { name: new RegExp(`새 팀 ${id}`) }).click();
  await page.getByRole('link', { name: '팀 페이지 보기' }).click();
  await expect(page).toHaveURL(new RegExp(`/ko/startups/${id.toLowerCase()}-[0-9a-f]{6}$`));
  await expect(page.getByText('비공개', { exact: true })).toBeVisible();

  await page.goBack();
  await page.goto('/ko/admin/teams');
  await page.getByRole('link', { name: new RegExp(`새 팀 ${id}`) }).click();
  await page.getByLabel('공개').check();
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.getByText('저장했어요.')).toBeVisible();

  await page.goto(`/ko/startups?cohort=${cohort}`);
  await expect(page.getByRole('link', { name: new RegExp(`새 팀 ${id}`) })).toBeVisible();
});

test('the startups list offers staff the way to create a team, and nobody else', async ({
  page,
  browser,
  baseURL,
}) => {
  await signIn(page, OPERATOR, baseURL!);
  await page.goto('/ko/startups');
  await page.getByRole('link', { name: '팀 만들기' }).click();
  await expect(page).toHaveURL(`${baseURL}/ko/admin/teams/new`);

  const others = await browser.newContext();
  const visitor = await others.newPage();
  await visitor.goto('/ko/startups');
  await expect(visitor.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(visitor.getByRole('link', { name: '팀 만들기' })).toHaveCount(0);
  await signIn(visitor, MEMBER, baseURL!);
  await visitor.goto('/ko/startups');
  await expect(visitor.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(visitor.getByRole('link', { name: '팀 만들기' })).toHaveCount(0);
  await others.close();
});

test('a refused team keeps what was typed, and two teams can share a name', async ({
  page,
  baseURL,
}, testInfo) => {
  const id = unique(testInfo);
  await signIn(page, OPERATOR, baseURL!);
  await page.goto('/ko/admin/teams/new');
  await expect(page.getByLabel('주소')).toHaveCount(0);
  await page.getByLabel('팀 이름').fill(`같은 이름 ${id}`);
  await page.getByLabel('기수').fill('abc');
  await page.getByRole('button', { name: '만들기' }).click();
  await expect(page.getByText('이 값은 쓸 수 없어요.')).toBeVisible();
  await expect(page.getByLabel('팀 이름')).toHaveValue(`같은 이름 ${id}`);

  for (let i = 0; i < 2; i += 1) {
    await page.goto('/ko/admin/teams/new');
    await page.getByLabel('팀 이름').fill(`같은 이름 ${id}`);
    await page.getByLabel('기수').fill('5');
    await page.getByRole('button', { name: '만들기' }).click();
    await expect(page.getByRole('heading', { level: 1, name: `같은 이름 ${id}` })).toBeVisible();
  }
  await page.goto('/ko/admin/teams');
  await expect(page.getByRole('link', { name: new RegExp(`같은 이름 ${id}`) })).toHaveCount(2);
});

test('adding a guest is refused, adding a member lets them post, removing them closes it', async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  const id = unique(testInfo);
  const slug = `people-${id}`;
  const teamId = await createTeam({ slug, name: `사람 팀 ${id}`, cohort: 5 });
  const memberEmail = `team-add-${id}@example.test`;
  created.push(memberEmail);
  await createOnboardedAccount(memberEmail, { role: 'member', names: ['추가', '회원'] });

  await signIn(page, OPERATOR, baseURL!);
  await page.goto(`/ko/admin/teams/${teamId}`);

  await page.getByLabel('이메일').fill(GUEST);
  await page.getByRole('button', { name: '팀원 넣기' }).click();
  await expect(page.getByText('먼저 회원으로 바꿔 주세요')).toBeVisible();

  await page.getByLabel('이메일').fill(`nobody-${id}@example.test`);
  await page.getByRole('button', { name: '팀원 넣기' }).click();
  await expect(page.getByText('이 이메일로 가입한 사람이 없어요.')).toBeVisible();

  await page.getByLabel('이메일').fill(memberEmail);
  await page.getByRole('button', { name: '팀원 넣기' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: memberEmail })).toBeVisible();

  const theirs = await browser.newContext();
  const member = await theirs.newPage();
  await signIn(member, memberEmail, baseURL!);
  expect((await member.goto(`/ko/startups/${slug}/posts/new`))?.status()).toBe(200);

  await page.getByRole('button', { name: `${memberEmail} 빼기` }).click();
  await expect(page.getByRole('listitem').filter({ hasText: memberEmail })).toHaveCount(0);
  expect((await member.goto(`/ko/startups/${slug}/posts/new`))?.status()).toBe(404);
  await theirs.close();
});

test('hiding a post takes it from visitors, keeps it for the team and staff, and can be undone', async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  const id = unique(testInfo);
  const slug = `hide-${id}`;
  const title = `숨길 글 ${id}`;
  const teamId = await createTeam({ slug, name: `숨김 팀 ${id}`, cohort: 5 });
  const memberEmail = `team-hide-${id}@example.test`;
  created.push(memberEmail);
  await createOnboardedAccount(memberEmail, { role: 'member' });
  await addTeamMember(teamId, memberEmail);
  const postId = await createPost(memberEmail, teamId, { title, body: '본문' });
  const postPath = `/ko/startups/${slug}/posts/${postId}`;

  await signIn(page, OPERATOR, baseURL!);
  await page.goto(postPath);
  // An operator can hide and delete, not edit.
  await expect(page.getByRole('link', { name: '수정', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '숨기기' }).click();
  await expect(page.locator('main').getByText('숨김', { exact: true })).toBeVisible();

  const strangers = await browser.newContext();
  const visitor = await strangers.newPage();
  expect((await visitor.goto(postPath))?.status()).toBe(404);
  await visitor.goto(`/ko/startups/${slug}`);
  await expect(visitor.getByText(title)).toHaveCount(0);

  const team = await browser.newContext();
  const member = await team.newPage();
  await signIn(member, memberEmail, baseURL!);
  await member.goto(`/ko/startups/${slug}`);
  await expect(member.getByRole('link', { name: new RegExp(title) })).toContainText('숨김');
  await team.close();

  await page.goto(`/ko/admin/teams/${teamId}`);
  await expect(page.getByRole('link', { name: title })).toBeVisible();
  await page.getByRole('button', { name: `${title} 되돌리기` }).click();
  await expect(page.getByRole('link', { name: title })).toHaveCount(0);

  expect((await visitor.goto(postPath))?.status()).toBe(200);
  await strangers.close();
});

test('someone who is not staff has no hide button on a post', async ({
  page,
  baseURL,
}, testInfo) => {
  const id = unique(testInfo);
  const slug = `no-hide-${id}`;
  const teamId = await createTeam({ slug, name: `단추 팀 ${id}`, cohort: 5 });
  const memberEmail = `team-nohide-${id}@example.test`;
  created.push(memberEmail);
  await createOnboardedAccount(memberEmail, { role: 'member' });
  await addTeamMember(teamId, memberEmail);
  const postId = await createPost(memberEmail, teamId, { title: `단추 글 ${id}` });

  await signIn(page, memberEmail, baseURL!);
  await page.goto(`/ko/startups/${slug}/posts/${postId}`);
  await expect(page.getByRole('link', { name: '수정', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '숨기기' })).toHaveCount(0);
});

test('an operator deletes a post from its page', async ({ page, baseURL }, testInfo) => {
  const id = unique(testInfo);
  const slug = `delete-${id}`;
  const teamId = await createTeam({ slug, name: `삭제 팀 ${id}`, cohort: 5 });
  const memberEmail = `team-del-${id}@example.test`;
  created.push(memberEmail);
  await createOnboardedAccount(memberEmail, { role: 'member' });
  await addTeamMember(teamId, memberEmail);
  const postId = await createPost(memberEmail, teamId, { title: `지울 글 ${id}` });

  await signIn(page, OPERATOR, baseURL!);
  await page.goto(`/ko/startups/${slug}/posts/${postId}`);
  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page.getByRole('button', { name: '삭제하기' }).click();
  await expect(page).toHaveURL(new RegExp(`/ko/startups/${slug}$`));
  await expect(page.getByText(`지울 글 ${id}`)).toHaveCount(0);
});

for (const email of [MEMBER, GUEST]) {
  test(`${email} gets a 404 on the team admin screens`, async ({ page, baseURL }) => {
    await signIn(page, email, baseURL!);
    expect((await page.goto('/ko/admin/teams'))?.status()).toBe(404);
    expect((await page.goto('/ko/admin/teams/new'))?.status()).toBe(404);
  });
}

test('signed out, the team admin screen goes to sign-in', async ({ page }) => {
  await page.goto('/ko/admin/teams');
  await expect(page).toHaveURL(/\/ko\/login\?next=/);
});

test('the team admin screens are noindex, clean on a phone and accessible', async ({
  page,
  baseURL,
}, testInfo) => {
  const id = unique(testInfo);
  const teamId = await createTeam({ slug: `shape-${id}`, name: `모양 팀 ${id}`, cohort: 5 });
  await signIn(page, OPERATOR, baseURL!);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = collectConsoleErrors(page);
  for (const path of ['/ko/admin/teams', '/en/admin/teams/new', `/ko/admin/teams/${teamId}`]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/);
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
  }
  expect(errors).toEqual([]);
});
