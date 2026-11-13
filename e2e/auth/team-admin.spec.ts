import { expect, test, type TestInfo } from '@playwright/test';
import { collectConsoleErrors, expectAccessible, expectNoHorizontalScroll } from '../helpers';
import {
  accountRows,
  addTeamMember,
  adminClient,
  clientSignedInAs,
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

async function createBlockedAccountFinished(email: string) {
  const id = await createOnboardedAccount(email, { role: 'member' });
  const { error } = await adminClient()
    .from('user_roles')
    .update({ blocked_at: new Date().toISOString() })
    .eq('user_id', id);
  if (error) throw error;
}

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
  // The cohort takes digits only; a number the database refuses still gets a message.
  await page.getByLabel('기수').fill('2기');
  await expect(page.getByLabel('기수')).toHaveValue('2');
  await page.getByLabel('기수').fill('0');
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

  // A refusal leaves the address in the field, to fix a typo.
  await page.getByLabel('이메일').fill(`nobody-${id}@example.test`);
  await page.getByRole('button', { name: '팀원 넣기' }).click();
  await expect(page.getByText('이 이메일로 가입한 사람이 없어요.')).toBeVisible();
  await expect(page.getByLabel('이메일')).toHaveValue(`nobody-${id}@example.test`);

  // A pattern is not an address, even if it would match somebody.
  await page.getByLabel('이메일').fill('*@example.test');
  await page.getByRole('button', { name: '팀원 넣기' }).click();
  await expect(page.getByText('이 이메일로 가입한 사람이 없어요.')).toBeVisible();

  // A blocked person is told apart: making them a member would not help.
  const blockedEmail = `team-blocked-${id}@example.test`;
  created.push(blockedEmail);
  await createBlockedAccountFinished(blockedEmail);
  await page.getByLabel('이메일').fill(blockedEmail);
  await page.getByRole('button', { name: '팀원 넣기' }).click();
  await expect(page.getByText('차단된 계정은 팀에 넣을 수 없어요.')).toBeVisible();

  await page.getByLabel('이메일').fill(memberEmail);
  await page.getByRole('button', { name: '팀원 넣기' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: memberEmail })).toBeVisible();
  await expect(page.getByLabel('이메일')).toHaveValue('');

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

test('an operator deletes a team, with its posts and files, and its members keep their accounts', async ({
  page,
  baseURL,
}, testInfo) => {
  const id = unique(testInfo);
  const name = `지울 팀 ${id}`;
  const email = `teamdel-${id}@example.test`;
  created.push(email);
  const memberId = await createOnboardedAccount(email, { role: 'member' });
  const teamId = await createTeam({ slug: `del-${id}`, name, cohort: 1 });
  await addTeamMember(teamId, email);
  const postId = await createPost(email, teamId, { title: `글 ${id}` });

  // A member of the team cannot do this, from the screen or around it.
  const member = await clientSignedInAs(email);
  const refused = await member.from('teams').delete().eq('id', teamId).select('id');
  expect(refused.data).toEqual([]);

  // Files in each of a team's three places.
  const storage = adminClient().storage;
  const body = { contentType: 'image/jpeg' };
  const file = Buffer.from('test');
  const logo = `${teamId}/${crypto.randomUUID()}.jpg`;
  const cover = `${teamId}/${crypto.randomUUID()}.jpg`;
  const photo = `${teamId}/${postId}/${crypto.randomUUID()}.jpg`;
  for (const [bucket, path] of [
    ['team-logos', logo],
    ['team-covers', cover],
    ['team-post-photos', photo],
  ] as const) {
    const { error } = await storage.from(bucket).upload(path, file, body);
    if (error) throw error;
  }
  const { error: photoError } = await member
    .from('team_posts')
    .update({ photo_paths: [photo] })
    .eq('id', postId);
  if (photoError) throw photoError;

  await signIn(page, OPERATOR, baseURL!);
  await page.goto(`/ko/admin/teams/${teamId}`);
  await page.getByRole('button', { name: '지우기', exact: true }).click();
  // It says what goes with the team before anything happens, and backing out changes nothing.
  await expect(page.getByText(/글 1개와 팀원 연결 1건/)).toBeVisible();
  await page.getByRole('button', { name: '취소' }).click();
  await expect(page.getByLabel('팀 이름')).toHaveValue(name);

  await page.getByRole('button', { name: '지우기', exact: true }).click();
  await page.getByRole('button', { name: '지우기', exact: true }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/teams$/);
  await expect(page.getByRole('link', { name: new RegExp(name) })).toHaveCount(0);

  expect((await page.request.get(`/ko/startups/del-${id}`)).status()).toBe(404);
  expect((await page.request.get(`/ko/admin/teams/${teamId}`)).status()).toBe(404);
  for (const [bucket, folder] of [
    ['team-logos', teamId],
    ['team-covers', teamId],
    ['team-post-photos', `${teamId}/${postId}`],
  ] as const) {
    const { data, error } = await storage.from(bucket).list(folder);
    if (error) throw error;
    expect(data).toEqual([]);
  }

  // Their account is untouched, and they are simply in no team.
  expect((await accountRows(email)).profile.id).toBe(memberId);
  const { data: memberships } = await member
    .from('team_members')
    .select('team_id')
    .eq('user_id', memberId);
  expect(memberships).toEqual([]);
});

test('on a short phone an operator can reach every menu item and the account links', async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 330, height: 575 });
  await signIn(page, OPERATOR, baseURL!);
  await page.goto('/ko');
  await page.getByRole('button', { name: '메뉴 열기' }).click();
  const sheet = page.getByRole('dialog');
  // The menu and the account block scroll together, so the menu is never cut to a sliver.
  for (const name of ['소개', '프로그램', '창업팀', '활동', '네트워크']) {
    await expect(sheet.getByRole('navigation').getByRole('link', { name })).toBeInViewport();
  }
  const last = sheet.getByRole('button', { name: '로그아웃' });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
});

test('the admin team list shows each team with its logo, or its initial', async ({
  page,
  baseURL,
}, testInfo) => {
  const id = unique(testInfo);
  // The highest cohort, so both rows open the list however many test teams the local stack holds.
  // Unpublished, so the public list's empty cohort 9999 stays empty for its own test.
  const hidden = { cohort: 9999, is_published: false };
  const withLogo = await createTeam({ slug: `logo-${id}`, name: `로고 팀 ${id}`, ...hidden });
  await createTeam({ slug: `plain-${id}`, name: `글자 팀 ${id}`, ...hidden });
  const logo = `${withLogo}/${crypto.randomUUID()}.png`;
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  const upload = await adminClient()
    .storage.from('team-logos')
    .upload(logo, png, { contentType: 'image/png' });
  if (upload.error) throw upload.error;
  const operator = await clientSignedInAs(OPERATOR);
  const { error } = await operator.from('teams').update({ logo_path: logo }).eq('id', withLogo);
  if (error) throw error;

  await signIn(page, OPERATOR, baseURL!);
  await page.goto('/ko/admin/teams');
  const row = page.getByRole('link', { name: new RegExp(`로고 팀 ${id}`) });
  await expect(row.locator(`img[src*="team-logos/${logo}"]`)).toHaveCount(1);
  const plain = page.getByRole('link', { name: new RegExp(`글자 팀 ${id}`) });
  await expect(plain.locator('img')).toHaveCount(0);
  await expect(plain).toContainText('글');
});
