import { readFileSync } from 'node:fs';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { collectConsoleErrors, expectAccessible, expectNoHorizontalScroll } from '../helpers';
import {
  addTeamMember,
  adminClient,
  anonymousClient,
  clientSignedInAs,
  createOnboardedAccount,
  createPost,
  createTeam,
  deleteAccount,
  removeTeamMember,
  setRole,
  signIn,
} from './helpers';

// What a team member does on their own page. Fake data on the local stack.
let counter = 0;
const created: string[] = [];

function unique(testInfo: TestInfo): string {
  counter += 1;
  return `${Date.now().toString(36)}-${testInfo.parallelIndex}${counter}`;
}

async function teamWithMember(testInfo: TestInfo) {
  const id = unique(testInfo);
  const email = `team-writer-${id}@example.test`;
  created.push(email);
  await createOnboardedAccount(email, { role: 'member' });
  const slug = `writer-team-${id}`;
  const teamId = await createTeam({ slug, name: `글쓰는 팀 ${id}`, cohort: 3 });
  await addTeamMember(teamId, email);
  return { id, email, slug, teamId };
}

test.afterAll(async () => {
  for (const email of created) await deleteAccount(email);
});

// Saving sends photos to Storage and then runs a server action, which takes longer than the default
// wait on a small machine.
const afterSave = expect.configure({ timeout: 30_000 });

// The smallest real PNG: one transparent pixel.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

function png(name: string) {
  return { name, mimeType: 'image/png', buffer: PIXEL };
}

// A real photo that is over the old 5MB limit and carries a location tag, the way a phone's would:
// a metadata segment right after the start of the JPEG, and padding after its end.
const SECRET = 'GPS-SECRET-LOCATION';
function phonePhoto(name = 'phone.jpg') {
  const jpeg = readFileSync('public/images/activities/workshop-2026-01.jpg');
  const payload = Buffer.from(`Exif\0\0${SECRET}`);
  const app1 = Buffer.alloc(4 + payload.length);
  app1[0] = 0xff;
  app1[1] = 0xe1;
  app1.writeUInt16BE(payload.length + 2, 2);
  payload.copy(app1, 4);
  const buffer = Buffer.concat([
    jpeg.subarray(0, 2),
    app1,
    jpeg.subarray(2),
    Buffer.alloc(6 * 1024 * 1024),
  ]);
  return { name, mimeType: 'image/jpeg', buffer };
}

async function openNewPost(page: Page, slug: string) {
  await page.goto(`/ko/startups/${slug}`);
  await page.getByRole('link', { name: '글쓰기' }).click();
  await expect(page.getByRole('heading', { level: 1, name: '글쓰기' })).toBeVisible();
}

async function filesOf(teamId: string, postId: string): Promise<string[]> {
  const { data, error } = await adminClient()
    .storage.from('team-post-photos')
    .list(`${teamId}/${postId}`);
  if (error) throw error;
  return (data ?? []).map((file) => file.name);
}

async function folderCountOf(teamId: string): Promise<number> {
  const { data, error } = await adminClient().storage.from('team-post-photos').list(teamId);
  if (error) throw error;
  return (data ?? []).length;
}

test('a member fixes the intro and a link, and the page shows them', async ({
  page,
  baseURL,
}, testInfo) => {
  const { email, slug } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await page.goto(`/ko/startups/${slug}`);
  await page.getByRole('link', { name: '소개 수정' }).click();

  await page.getByLabel('한 줄 소개').fill('새로운 한 줄');
  await page.getByLabel('소개', { exact: true }).fill('둘째 줄까지\n있는 소개');
  await page.getByRole('button', { name: '링크 추가' }).click();
  await page.getByLabel('주소').fill('javascript:alert(1)');
  await page.getByRole('button', { name: '저장' }).click();
  await expect(
    page.getByText('http:// 또는 https://로 시작하는 주소를 적어 주세요.'),
  ).toBeVisible();

  await page.getByLabel('주소').fill('https://new.example.test/');
  await page.getByRole('button', { name: '저장' }).click();

  await expect(page).toHaveURL(new RegExp(`/ko/startups/${slug}$`));
  await expect(page.getByText('새로운 한 줄')).toBeVisible();
  await expect(page.getByText(/둘째 줄까지/)).toBeVisible();
  await expect(page.getByRole('link', { name: '홈페이지' })).toHaveAttribute(
    'href',
    'https://new.example.test/',
  );
});

test('a member uploads a logo and it shows on the page', async ({ page, baseURL }, testInfo) => {
  const { email, slug } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await page.goto(`/ko/startups/${slug}/edit`);
  await page.getByLabel('로고').setInputFiles(png('logo.png'));
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL(new RegExp(`/ko/startups/${slug}$`));
  const logo = page.locator('main img[src*="team-logos"]').first();
  await expect(logo).toBeVisible();
  const response = await page.request.get((await logo.getAttribute('src'))!);
  expect(response.status()).toBe(200);
});

test('a post with a photo reaches a signed-out visitor, until it is changed to signed-in only', async ({
  page,
  baseURL,
  browser,
}, testInfo) => {
  const { id, email, slug, teamId } = await teamWithMember(testInfo);
  const title = `사진 글 ${id}`;
  await signIn(page, email, baseURL!);
  await openNewPost(page, slug);

  await expect(page.getByRole('radio', { name: '완전 공개' })).toBeChecked();
  await page.getByLabel('제목').fill(title);
  await page
    .getByLabel('본문')
    .fill('<script>window.hacked = true</script> 자세히는 https://more.example.test/x 에서');
  await page.getByLabel('사진 추가').setInputFiles(png('a.png'));
  await expect(page.getByText('사진 속 인물과 글에 적은 개인정보는')).toBeVisible();
  await page.getByRole('button', { name: '올리기' }).click();
  await afterSave(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  const postUrl = page.url();
  const postId = postUrl.split('/').pop()!;

  // Plain text: the tag is words on the page, and the address is a link.
  await expect(page.getByText('<script>window.hacked = true</script>')).toBeVisible();
  expect(await page.evaluate(() => 'hacked' in window)).toBe(false);
  await expect(page.getByRole('link', { name: 'https://more.example.test/x' })).toBeVisible();

  const stranger = await browser.newContext();
  const visitor = await stranger.newPage();
  await visitor.goto(postUrl);
  await expect(visitor.getByRole('heading', { level: 1, name: title })).toBeVisible();
  const photo = visitor.locator('main article img');
  await expect(photo).toBeVisible();
  const src = (await photo.getAttribute('src'))!;
  expect((await visitor.request.get(src)).status()).toBe(200);

  // To signed-in only: the page is gone for them, and no new photo address is issued.
  await page.getByRole('link', { name: '수정', exact: true }).click();
  await page.getByRole('radio', { name: '가입자만' }).check();
  await page.getByRole('button', { name: '저장' }).click();
  await afterSave(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.locator('main').getByText('가입자만')).toBeVisible();
  // Changing only who can read it does not count as editing the words.
  await expect(page.getByText(/\d{4}\.\d{2}\.\d{2} 수정/)).toHaveCount(0);

  expect((await visitor.goto(postUrl))?.status()).toBe(404);
  const { data: files } = await adminClient()
    .storage.from('team-post-photos')
    .list(`${teamId}/${postId}`);
  const signed = await anonymousClient()
    .storage.from('team-post-photos')
    .createSignedUrl(`${teamId}/${postId}/${files![0].name}`, 60);
  expect(signed.data).toBeNull();
  await stranger.close();
});

test('the latest public photo opens the team page, and leaves when the post closes', async ({
  page,
  baseURL,
  browser,
}, testInfo) => {
  const { id, email, slug } = await teamWithMember(testInfo);
  const stranger = await browser.newContext();
  const visitor = await stranger.newPage();
  const cover = visitor.locator('[data-team-cover] img[data-cover-photo][src*="team-post-photos"]');

  // Without a photo there is nothing behind the name.
  await visitor.goto(`/ko/startups/${slug}`);
  await expect(visitor.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(cover).toHaveCount(0);

  await signIn(page, email, baseURL!);
  await openNewPost(page, slug);
  await page.getByLabel('제목').fill(`표지 글 ${id}`);
  await page.getByLabel('사진 추가').setInputFiles(png('a.png'));
  await page.getByRole('button', { name: '올리기' }).click();
  await afterSave(page.getByRole('heading', { level: 1, name: `표지 글 ${id}` })).toBeVisible();

  await visitor.goto(`/ko/startups/${slug}`);
  await expect(cover).toHaveCount(1);
  expect((await visitor.request.get((await cover.getAttribute('src'))!)).status()).toBe(200);

  await page.getByRole('link', { name: '수정', exact: true }).click();
  await page.getByRole('radio', { name: '가입자만' }).check();
  await page.getByRole('button', { name: '저장' }).click();
  // The form says 가입자만 too, so wait for the save to leave the form.
  await afterSave(page).toHaveURL(/\/posts\/[0-9a-f-]+$/);

  await visitor.goto(`/ko/startups/${slug}`);
  await expect(visitor.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(cover).toHaveCount(0);

  // A signed-in post is not a cover for anyone, members included.
  await page.goto(`/ko/startups/${slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(
    page.locator('[data-team-cover] img[data-cover-photo][src*="team-post-photos"]'),
  ).toHaveCount(0);
  await stranger.close();
});

test('a chosen cover opens the team page ahead of any post photo, until it is removed', async ({
  page,
  baseURL,
  browser,
}, testInfo) => {
  const { id, email, slug, teamId } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await openNewPost(page, slug);
  await page.getByLabel('제목').fill(`표지 경쟁 글 ${id}`);
  await page.getByLabel('사진 추가').setInputFiles(png('a.png'));
  await page.getByRole('button', { name: '올리기' }).click();
  await afterSave(
    page.getByRole('heading', { level: 1, name: `표지 경쟁 글 ${id}` }),
  ).toBeVisible();

  await page.goto(`/ko/startups/${slug}/edit`);
  await page.getByLabel('표지 사진', { exact: true }).setInputFiles(png('cover.png'));
  await page.getByRole('button', { name: '저장' }).click();
  await afterSave(page).toHaveURL(new RegExp(`/ko/startups/${slug}$`));

  const stranger = await browser.newContext();
  const visitor = await stranger.newPage();
  await visitor.goto(`/ko/startups/${slug}`);
  const chosen = visitor.locator('[data-team-cover] img[data-cover-photo][src*="team-covers"]');
  await expect(chosen).toHaveCount(1);
  // The cover is shown whole and never past its own size, over a blurred copy of itself.
  await expect(chosen).toHaveJSProperty('complete', true);
  const fit = await chosen.evaluate((img: HTMLImageElement) => ({
    shown: img.getBoundingClientRect().width,
    natural: img.naturalWidth,
    objectFit: getComputedStyle(img).objectFit,
  }));
  expect(fit.objectFit).toBe('contain');
  expect(fit.shown).toBeLessThanOrEqual(fit.natural + 1);
  await expect(
    visitor.locator('[data-team-cover] img[data-cover-photo][src*="team-post-photos"]'),
  ).toHaveCount(0);
  expect((await visitor.request.get((await chosen.getAttribute('src'))!)).status()).toBe(200);

  async function coverFiles() {
    const { data, error } = await adminClient().storage.from('team-covers').list(teamId);
    if (error) throw error;
    return data.length;
  }
  await expect.poll(coverFiles).toBe(1);

  // A new cover takes the old file's place.
  await page.goto(`/ko/startups/${slug}/edit`);
  await page.getByLabel('표지 사진', { exact: true }).setInputFiles(png('second.png'));
  await page.getByRole('button', { name: '저장' }).click();
  await afterSave(page).toHaveURL(new RegExp(`/ko/startups/${slug}$`));
  await expect.poll(coverFiles).toBe(1);

  // Taken off, the latest public photo comes back.
  await page.goto(`/ko/startups/${slug}/edit`);
  await page.getByLabel('지금 표지 사진 빼기').check();
  await page.getByRole('button', { name: '저장' }).click();
  await afterSave(page).toHaveURL(new RegExp(`/ko/startups/${slug}$`));
  await expect.poll(coverFiles).toBe(0);
  await visitor.goto(`/ko/startups/${slug}`);
  await expect(
    visitor.locator('[data-team-cover] img[data-cover-photo][src*="team-post-photos"]'),
  ).toHaveCount(1);
  await stranger.close();
});

test('a cover over 30MB is refused before any upload and leaves the field empty', async ({
  page,
  baseURL,
}, testInfo) => {
  const { email, slug } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await page.goto(`/ko/startups/${slug}/edit`);
  await page.getByLabel('표지 사진', { exact: true }).setInputFiles({
    name: 'big.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(31 * 1024 * 1024),
  });
  await expect(page.getByText('사진은 한 장에 30MB까지 올릴 수 있어요.')).toBeVisible();
  await expect(page.getByLabel('표지 사진', { exact: true })).toHaveValue('');
});

test('my page lists my teams with links, and a team I leave goes away', async ({
  page,
  baseURL,
}, testInfo) => {
  const { id, email, slug, teamId } = await teamWithMember(testInfo);
  const hidden = await createTeam({
    slug: `my-hidden-${id}`,
    name: `비공개 내 팀 ${id}`,
    cohort: 3,
    is_published: false,
  });
  await addTeamMember(hidden, email);

  await signIn(page, email, baseURL!);
  await page.goto('/ko/me');
  const teams = page.locator('main').getByRole('link', { name: new RegExp(`${id}$`) });
  await expect(teams).toHaveCount(2);
  await expect(page.getByRole('link', { name: `글쓰는 팀 ${id}` })).toHaveAttribute(
    'href',
    `/ko/startups/${slug}`,
  );
  await expect(page.getByText('소속 팀')).toBeVisible();

  await removeTeamMember(teamId, email);
  await removeTeamMember(hidden, email);
  await page.goto('/ko/me');
  await expect(page.getByText(`글쓰는 팀 ${id}`)).toHaveCount(0);
  // Someone in no team sees no empty row.
  await expect(page.getByText('소속 팀')).toHaveCount(0);
});

test('editing shows the edited time, and deleting removes the post and its files', async ({
  page,
  baseURL,
}, testInfo) => {
  const { id, email, slug, teamId } = await teamWithMember(testInfo);
  const title = `지울 글 ${id}`;
  await signIn(page, email, baseURL!);
  await openNewPost(page, slug);
  await page.getByLabel('제목').fill(title);
  await page.getByLabel('사진 추가').setInputFiles(png('a.png'));
  await page.getByRole('button', { name: '올리기' }).click();
  await afterSave(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  const postUrl = page.url();
  const postId = postUrl.split('/').pop()!;
  await expect.poll(() => filesOf(teamId, postId)).toHaveLength(1);

  await page.getByRole('link', { name: '수정', exact: true }).click();
  await page.getByLabel('제목').fill(`${title} 고침`);
  await page.getByRole('button', { name: '저장' }).click();
  await afterSave(page.getByRole('heading', { level: 1, name: `${title} 고침` })).toBeVisible();
  await expect(page.getByText(/\d{4}\.\d{2}\.\d{2} 수정/)).toBeVisible();

  await page.getByRole('button', { name: '삭제', exact: true }).click();
  await page.getByRole('button', { name: '삭제하기' }).click();
  await expect(page).toHaveURL(new RegExp(`/ko/startups/${slug}$`));
  await expect(page.getByText(`${title} 고침`)).toHaveCount(0);
  expect((await page.goto(postUrl))?.status()).toBe(404);
  await expect.poll(() => filesOf(teamId, postId)).toHaveLength(0);
});

test('removing a photo while editing removes the file', async ({ page, baseURL }, testInfo) => {
  const { id, email, slug, teamId } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await openNewPost(page, slug);
  await page.getByLabel('제목').fill(`사진 뺄 글 ${id}`);
  await page.getByLabel('사진 추가').setInputFiles([png('a.png'), png('b.png')]);
  await page.getByRole('button', { name: '올리기' }).click();
  await afterSave(page.getByRole('heading', { level: 1, name: `사진 뺄 글 ${id}` })).toBeVisible();
  const postId = page.url().split('/').pop()!;
  await expect(page.locator('main article img')).toHaveCount(2);

  await page.getByRole('link', { name: '수정', exact: true }).click();
  await page.getByRole('button', { name: '사진 1 빼기' }).click();
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.locator('main article img')).toHaveCount(1);
  await expect.poll(() => filesOf(teamId, postId)).toHaveLength(1);
});

test('a member of another team gets a 404 on the writing pages', async ({
  page,
  baseURL,
}, testInfo) => {
  const mine = await teamWithMember(testInfo);
  const theirs = await teamWithMember(testInfo);
  await signIn(page, mine.email, baseURL!);
  expect((await page.goto(`/ko/startups/${theirs.slug}/edit`))?.status()).toBe(404);
  expect((await page.goto(`/ko/startups/${theirs.slug}/posts/new`))?.status()).toBe(404);
  await page.goto(`/ko/startups/${theirs.slug}`);
  await expect(page.getByRole('link', { name: '글쓰기' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '소개 수정' })).toHaveCount(0);
});

test('a guest gets a 404 on the writing pages', async ({ page, baseURL }, testInfo) => {
  const { slug } = await teamWithMember(testInfo);
  await signIn(page, 'guest@example.test', baseURL!);
  expect((await page.goto(`/ko/startups/${slug}/edit`))?.status()).toBe(404);
  expect((await page.goto(`/ko/startups/${slug}/posts/new`))?.status()).toBe(404);
});

test('signed out, the writing pages go to sign-in', async ({ page }, testInfo) => {
  const { slug } = await teamWithMember(testInfo);
  await page.goto(`/ko/startups/${slug}/posts/new`);
  await expect(page).toHaveURL(/\/ko\/login\?next=/);
});

test('when the third of four photos fails, nothing is posted, the files go and the text stays', async ({
  page,
  baseURL,
}, testInfo) => {
  const { id, email, slug, teamId } = await teamWithMember(testInfo);
  const title = `실패할 글 ${id}`;
  await signIn(page, email, baseURL!);
  await openNewPost(page, slug);
  await page.getByLabel('제목').fill(title);
  await page.getByLabel('본문').fill('지워지면 안 되는 본문');
  await page
    .getByLabel('사진 추가')
    .setInputFiles([png('a.png'), png('b.png'), png('c.png'), png('d.png')]);

  let uploads = 0;
  await page.route('**/storage/v1/object/team-post-photos/**', async (route) => {
    if (route.request().method() === 'POST') {
      uploads += 1;
      if (uploads === 3) return route.abort();
    }
    return route.continue();
  });
  await page.getByRole('button', { name: '올리기' }).click();

  await expect(page.getByText('사진을 올리지 못했어요.')).toBeVisible();
  await expect(page.getByLabel('제목')).toHaveValue(title);
  await expect(page.getByLabel('본문')).toHaveValue('지워지면 안 되는 본문');
  await page.unroute('**/storage/v1/object/team-post-photos/**');

  await page.goto(`/ko/startups/${slug}`);
  await expect(page.getByText(title)).toHaveCount(0);
  await expect.poll(() => folderCountOf(teamId)).toBe(0);
});

for (const change of ['demoted', 'blocked', 'removed'] as const) {
  test(`a member ${change} while the form is open is refused on save, and nothing is written`, async ({
    page,
    baseURL,
  }, testInfo) => {
    const { id, email, slug, teamId } = await teamWithMember(testInfo);
    await signIn(page, email, baseURL!);
    await page.goto(`/ko/startups/${slug}/edit`);
    await page.getByLabel('한 줄 소개').fill(`권한 없는 수정 ${id}`);

    if (change === 'demoted') await setRole(email, 'guest');
    if (change === 'removed') await removeTeamMember(teamId, email);
    if (change === 'blocked') {
      const { data } = await adminClient()
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      await adminClient()
        .from('user_roles')
        .update({ blocked_at: new Date().toISOString() })
        .eq('user_id', data!.id);
    }

    await page.getByRole('button', { name: '저장' }).click();
    await expect(page.getByText('이 팀의 내용을 고칠 권한이 없어요.')).toBeVisible();
    await expect(page.getByLabel('한 줄 소개')).toHaveValue(`권한 없는 수정 ${id}`);

    const reader = anonymousClient();
    const { data: team } = await reader.from('teams').select('tagline').eq('id', teamId).single();
    expect(team?.tagline).toBe('');
  });
}

test('a member who lost access is refused when posting too', async ({
  page,
  baseURL,
}, testInfo) => {
  const { id, email, slug, teamId } = await teamWithMember(testInfo);
  const title = `못 올릴 글 ${id}`;
  await signIn(page, email, baseURL!);
  await openNewPost(page, slug);
  await page.getByLabel('제목').fill(title);
  await removeTeamMember(teamId, email);
  await page.getByRole('button', { name: '올리기' }).click();
  await afterSave(page.getByText('이 팀의 내용을 고칠 권한이 없어요.')).toBeVisible();
  await expect(page.getByLabel('제목')).toHaveValue(title);
  const { data } = await anonymousClient().from('team_posts').select('id').eq('title', title);
  expect(data).toEqual([]);
});

test('a member who lost access is refused when editing a post, and it stays as it was', async ({
  page,
  baseURL,
}, testInfo) => {
  const { id, email, slug, teamId } = await teamWithMember(testInfo);
  const title = `그대로 둘 글 ${id}`;
  const postId = await createPost(email, teamId, { title });
  await signIn(page, email, baseURL!);
  await page.goto(`/ko/startups/${slug}/posts/${postId}/edit`);
  await page.getByLabel('제목').fill(`${title} 고침`);
  await removeTeamMember(teamId, email);
  await page.getByRole('button', { name: '저장' }).click();
  await afterSave(page.getByText('이 팀의 내용을 고칠 권한이 없어요.')).toBeVisible();
  await expect(page.getByLabel('제목')).toHaveValue(`${title} 고침`);
  const { data } = await anonymousClient().from('team_posts').select('title').eq('id', postId);
  expect(data).toEqual([{ title }]);
});

test('when the connection drops on save, the form keeps everything and says so', async ({
  page,
  baseURL,
}, testInfo) => {
  const { id, email, slug } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await openNewPost(page, slug);
  await page.getByLabel('제목').fill(`끊긴 글 ${id}`);
  await page.getByLabel('본문').fill('남아야 할 본문');
  await page.route('**/posts/new', async (route) =>
    route.request().method() === 'POST' ? route.abort() : route.continue(),
  );
  await page.getByRole('button', { name: '올리기' }).click();
  await afterSave(page.getByText('저장하지 못했어요.')).toBeVisible();
  await expect(page.getByLabel('제목')).toHaveValue(`끊긴 글 ${id}`);
  await expect(page.getByLabel('본문')).toHaveValue('남아야 할 본문');

  // Sent again, the same post goes up once.
  await page.unroute('**/posts/new');
  await page.getByRole('button', { name: '올리기' }).click();
  await afterSave(page.getByRole('heading', { level: 1, name: `끊긴 글 ${id}` })).toBeVisible();
});

test('saving an open form does not undo a photo or logo another member just added', async ({
  page,
  baseURL,
}, testInfo) => {
  const { id, email, slug, teamId } = await teamWithMember(testInfo);
  const title = `둘이 고치는 글 ${id}`;
  await signIn(page, email, baseURL!);
  await openNewPost(page, slug);
  await page.getByLabel('제목').fill(title);
  await page.getByLabel('사진 추가').setInputFiles(png('a.png'));
  await page.getByRole('button', { name: '올리기' }).click();
  await afterSave(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  const postId = page.url().split('/').pop()!;

  // The form opens, and then a teammate adds a photo.
  await page.goto(`/ko/startups/${slug}/posts/${postId}/edit`);
  const teammate = await clientSignedInAs(email);
  const photo = `${teamId}/${postId}/${crypto.randomUUID()}.png`;
  expect(
    (
      await teammate.storage
        .from('team-post-photos')
        .upload(photo, PIXEL, { contentType: 'image/png' })
    ).error,
  ).toBeNull();
  const { data: post } = await teammate
    .from('team_posts')
    .select('photo_paths')
    .eq('id', postId)
    .single();
  expect(
    (
      await teammate
        .from('team_posts')
        .update({ photo_paths: [...post!.photo_paths, photo] })
        .eq('id', postId)
    ).error,
  ).toBeNull();

  await page.getByLabel('제목').fill(`${title} 고침`);
  await page.getByRole('button', { name: '저장' }).click();
  await afterSave(page.getByRole('heading', { level: 1, name: `${title} 고침` })).toBeVisible();
  await expect(page.locator('main article img')).toHaveCount(2);
  await expect.poll(() => filesOf(teamId, postId)).toHaveLength(2);

  // The same with the logo.
  await page.goto(`/ko/startups/${slug}/edit`);
  const logo = `${teamId}/${crypto.randomUUID()}.png`;
  expect(
    (await teammate.storage.from('team-logos').upload(logo, PIXEL, { contentType: 'image/png' }))
      .error,
  ).toBeNull();
  expect(
    (await teammate.from('teams').update({ logo_path: logo }).eq('id', teamId)).error,
  ).toBeNull();
  await page.getByLabel('한 줄 소개').fill('로고는 그대로');
  await page.getByRole('button', { name: '저장' }).click();
  await afterSave(page.getByText('로고는 그대로')).toBeVisible();
  const { data: team } = await teammate.from('teams').select('logo_path').eq('id', teamId).single();
  expect(team?.logo_path).toBe(logo);
});

test('a refused logo does not stay in the form', async ({ page, baseURL }, testInfo) => {
  const { email, slug } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await page.goto(`/ko/startups/${slug}/edit`);
  await page.getByLabel('로고').setInputFiles({
    name: 'x.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  });
  await expect(page.getByText('JPEG, PNG, WebP 사진만 올릴 수 있어요.')).toBeInViewport();
  await expect(page.getByLabel('로고')).toHaveValue('');
});

test('the site asks for photo addresses that last 10 minutes', async ({
  page,
  baseURL,
}, testInfo) => {
  const { id, email, slug } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await openNewPost(page, slug);
  await page.getByLabel('제목').fill(`시간 글 ${id}`);
  await page.getByLabel('사진 추가').setInputFiles(png('a.png'));
  await page.getByRole('button', { name: '올리기' }).click();
  await afterSave(page.getByRole('heading', { level: 1, name: `시간 글 ${id}` })).toBeVisible();
  const src = (await page.locator('main article img').getAttribute('src'))!;
  const token = new URL(src).searchParams.get('token')!;
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  expect(claims.exp - claims.iat).toBe(600);
});

test('a file over 30MB or an SVG is refused before any upload', async ({
  page,
  baseURL,
}, testInfo) => {
  const { id, email, slug } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await openNewPost(page, slug);

  let uploads = 0;
  await page.route('**/storage/v1/object/**', async (route) => {
    if (route.request().method() === 'POST') uploads += 1;
    return route.continue();
  });

  await page.getByLabel('사진 추가').setInputFiles({
    name: 'big.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(31 * 1024 * 1024),
  });
  await expect(page.getByText('사진은 한 장에 30MB까지 올릴 수 있어요.')).toBeVisible();

  await page.getByLabel('사진 추가').setInputFiles({
    name: 'x.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
  });
  await expect(page.getByText('JPEG, PNG, WebP 사진만 올릴 수 있어요.')).toBeVisible();

  // Neither was kept, so posting now sends no file.
  await page.getByLabel('제목').fill(`파일 없는 글 ${id}`);
  await page.getByRole('button', { name: '올리기' }).click();
  await afterSave(
    page.getByRole('heading', { level: 1, name: `파일 없는 글 ${id}` }),
  ).toBeVisible();
  expect(uploads).toBe(0);
});

test('a large phone photo goes up smaller and without its location', async ({
  page,
  baseURL,
}, testInfo) => {
  const { id, email, slug, teamId } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await openNewPost(page, slug);
  await page.getByLabel('제목').fill(`폰 사진 글 ${id}`);
  await page.getByLabel('사진 추가').setInputFiles(phonePhoto());
  await page.getByRole('button', { name: '올리기' }).click();
  await afterSave(page.getByRole('heading', { level: 1, name: `폰 사진 글 ${id}` })).toBeVisible();
  const postId = page.url().split('/').pop()!;

  const [name] = await filesOf(teamId, postId);
  const { data, error } = await adminClient()
    .storage.from('team-post-photos')
    .download(`${teamId}/${postId}/${name}`);
  if (error) throw error;
  const bytes = Buffer.from(await data.arrayBuffer());
  expect(bytes.length).toBeLessThan(2 * 1024 * 1024);
  expect(bytes.includes(SECRET)).toBe(false);
  await expect(page.locator('main article img')).toHaveCount(1);
});

test('a file the browser cannot read as a picture says so, and the text stays', async ({
  page,
  baseURL,
}, testInfo) => {
  const { id, email, slug } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await openNewPost(page, slug);
  await page.getByLabel('제목').fill(`못 읽는 사진 ${id}`);
  await page.getByLabel('사진 추가').setInputFiles({
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: Buffer.from('this is not a picture'),
  });
  await page.getByRole('button', { name: '올리기' }).click();
  await afterSave(page.getByText('사진을 읽지 못했어요.')).toBeVisible();
  await expect(page.getByLabel('제목')).toHaveValue(`못 읽는 사진 ${id}`);
});

test('photos show in the lists, and a closed post leaves them', async ({
  page,
  baseURL,
  browser,
}, testInfo) => {
  const { id, email, slug } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await openNewPost(page, slug);
  await page.getByLabel('제목').fill(`썸네일 글 ${id}`);
  await page.getByLabel('사진 추가').setInputFiles(png('a.png'));
  await page.getByRole('button', { name: '올리기' }).click();
  await afterSave(page.getByRole('heading', { level: 1, name: `썸네일 글 ${id}` })).toBeVisible();

  const stranger = await browser.newContext();
  const visitor = await stranger.newPage();
  await visitor.goto(`/ko/startups/${slug}`);
  const row = visitor.getByRole('link', { name: new RegExp(`썸네일 글 ${id}`) });
  await expect(row.locator('img')).toHaveCount(1);
  expect(
    (await visitor.request.get((await row.locator('img').getAttribute('src'))!)).status(),
  ).toBe(200);

  await page.goto(`/ko/startups/${slug}`);
  await page.getByRole('link', { name: new RegExp(`썸네일 글 ${id}`) }).click();
  await page.getByRole('link', { name: '수정', exact: true }).click();
  await page.getByRole('radio', { name: '가입자만' }).check();
  await page.getByRole('button', { name: '저장' }).click();
  await afterSave(page).toHaveURL(/\/posts\/[0-9a-f-]+$/);

  await visitor.goto(`/ko/startups/${slug}`);
  await expect(visitor.getByText(`썸네일 글 ${id}`)).toHaveCount(0);
  await expect(visitor.locator('main section img[src*="team-post-photos"]')).toHaveCount(0);
  await stranger.close();
});

test('a member who lost access is told so when a photo is refused', async ({
  page,
  baseURL,
}, testInfo) => {
  const { id, email, slug, teamId } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await openNewPost(page, slug);
  await page.getByLabel('제목').fill(`사진 거절 글 ${id}`);
  await page.getByLabel('사진 추가').setInputFiles(png('a.png'));
  await removeTeamMember(teamId, email);
  await page.getByRole('button', { name: '올리기' }).click();
  await afterSave(page.getByText('이 팀의 내용을 고칠 권한이 없어요.')).toBeVisible();
  await expect(page.getByText('사진을 올리지 못했어요.')).toHaveCount(0);
  await expect(page.getByLabel('제목')).toHaveValue(`사진 거절 글 ${id}`);
});

test('a bad link is marked on its own row when a row above is blank', async ({
  page,
  baseURL,
}, testInfo) => {
  const { email, slug } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await page.goto(`/ko/startups/${slug}/edit`);
  await page.getByRole('button', { name: '링크 추가' }).click();
  await page.getByRole('button', { name: '링크 추가' }).click();
  const addresses = page.getByLabel('주소');
  await addresses.nth(1).fill('javascript:alert(1)');
  await page.getByRole('button', { name: '저장' }).click();
  await afterSave(
    page.getByText('http:// 또는 https://로 시작하는 주소를 적어 주세요.'),
  ).toBeVisible();
  await expect(addresses.nth(1)).toHaveAttribute('aria-invalid', 'true');
  await expect(addresses.nth(0)).not.toHaveAttribute('aria-invalid', 'true');
});

test('a page past the end says so and offers the way back', async ({ page }, testInfo) => {
  const { email, slug, teamId } = await teamWithMember(testInfo);
  await createPost(email, teamId, { title: '있는 글' });
  await page.goto(`/ko/startups/${slug}?page=99`);
  await expect(page.getByText('이 쪽에는 글이 없어요.')).toBeVisible();
  await expect(page.getByText('아직 올라온 글이 없어요.')).toHaveCount(0);
  await page.getByRole('link', { name: '첫 쪽으로' }).click();
  await expect(page.getByRole('link', { name: /있는 글/ })).toBeVisible();

  // The team list is one page: an old page number opens the whole list.
  await page.goto('/ko/startups?page=99999');
  await expect(page.getByText(/\d+개 팀/)).toBeVisible();
  await expect(page.getByRole('link', { name: '첫 쪽으로' })).toHaveCount(0);
});

test('two links to the same address both show', async ({ page, baseURL }, testInfo) => {
  const { email, slug } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await page.goto(`/ko/startups/${slug}/edit`);
  await page.getByRole('button', { name: '링크 추가' }).click();
  await page.getByRole('button', { name: '링크 추가' }).click();
  await page.getByLabel('주소').nth(0).fill('https://same.example.test/');
  await page.getByLabel('주소').nth(1).fill('https://same.example.test/');
  await page.getByRole('button', { name: '저장' }).click();
  await afterSave(page).toHaveURL(new RegExp(`/ko/startups/${slug}$`));
  await expect(page.getByRole('link', { name: '홈페이지' })).toHaveCount(2);
});

test('going back after a save shows what was saved, not the old text', async ({
  page,
  baseURL,
}, testInfo) => {
  const { id, email, slug } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await page.goto(`/ko/startups/${slug}`);
  await page.getByRole('link', { name: '소개 수정' }).click();
  await page.getByLabel('한 줄 소개').fill(`저장한 한 줄 ${id}`);
  await page.getByRole('button', { name: '저장' }).click();
  await afterSave(page.getByText(`저장한 한 줄 ${id}`)).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel('한 줄 소개')).toHaveValue(`저장한 한 줄 ${id}`);
});

test('a shared team link carries the team name, its line and its cover', async ({
  page,
  baseURL,
  request,
}, testInfo) => {
  const { id, email, slug } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await page.goto(`/ko/startups/${slug}/edit`);
  await page.getByLabel('한 줄 소개').fill(`공유되는 한 줄 ${id}`);
  await page.getByLabel('표지 사진', { exact: true }).setInputFiles(png('cover.png'));
  await page.getByRole('button', { name: '저장' }).click();
  await afterSave(page).toHaveURL(new RegExp(`/ko/startups/${slug}$`));

  const html = await (await request.get(`/ko/startups/${slug}`)).text();
  expect(html).toContain(`property="og:title" content="글쓰는 팀 ${id}`);
  expect(html).toContain(`property="og:description" content="공유되는 한 줄 ${id}"`);
  expect(html).toMatch(/property="og:image" content="[^"]*team-covers/);
  // A shared card must not hold a temporary photo address.
  expect(html).not.toMatch(/property="og:image" content="[^"]*token=/);
});

test('a shared public post link carries its title, and a closed one tells nothing', async ({
  request,
}, testInfo) => {
  const { id, email, slug, teamId } = await teamWithMember(testInfo);
  const open = await createPost(email, teamId, { title: `공유 글 ${id}`, body: '공유 본문' });
  const closed = await createPost(email, teamId, {
    title: `비밀 글 ${id}`,
    body: '비밀 본문',
    visibility: 'signed_in',
  });
  const html = await (await request.get(`/ko/startups/${slug}/posts/${open}`)).text();
  expect(html).toContain(`property="og:title" content="공유 글 ${id}`);
  expect(html).toContain('property="og:description" content="공유 본문"');
  const refused = await request.get(`/ko/startups/${slug}/posts/${closed}`);
  expect(refused.status()).toBe(404);
  expect(await refused.text()).not.toContain(`비밀 글 ${id}`);
});

// The bucket limits are not asked on a copy, so the database policies have to hold them, on the real
// Storage server too.
test('a logo cannot be copied into an SVG', async ({ request }, testInfo) => {
  const { email, teamId } = await teamWithMember(testInfo);
  const member = await clientSignedInAs(email);
  const from = `${teamId}/${crypto.randomUUID()}.png`;
  const upload = await member.storage
    .from('team-logos')
    .upload(from, PIXEL, { contentType: 'image/png' });
  expect(upload.error).toBeNull();

  const { data } = await member.auth.getSession();
  const copyAs = (mimetype: string) =>
    request.post(`${process.env.E2E_SUPABASE_URL}/storage/v1/object/copy`, {
      headers: {
        Authorization: `Bearer ${data.session!.access_token}`,
        apikey: process.env.E2E_SUPABASE_PUBLISHABLE_KEY!,
      },
      data: {
        bucketId: 'team-logos',
        sourceKey: from,
        destinationBucket: 'team-logos',
        destinationKey: `${teamId}/${crypto.randomUUID()}.png`,
        copyMetadata: false,
        metadata: { mimetype },
      },
    });
  // The same request as an image goes through, so the refusal below is about the type.
  expect((await copyAs('image/png')).ok()).toBe(true);
  expect((await copyAs('image/svg+xml')).ok()).toBe(false);
});

test('at most four photos can be picked', async ({ page, baseURL }, testInfo) => {
  const { email, slug } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await openNewPost(page, slug);
  // Where a person is after using the photo button: the message has to be on screen there, not
  // somewhere further down a phone's long form.
  await page.getByLabel('사진 추가').scrollIntoViewIfNeeded();
  await page
    .getByLabel('사진 추가')
    .setInputFiles(['a', 'b', 'c', 'd', 'e'].map((n) => png(`${n}.png`)));
  await expect(page.getByText('사진은 글마다 4장까지 올릴 수 있어요.')).toBeInViewport();
});

test('the forms are clean on a phone and pass the accessibility check', async ({
  page,
  baseURL,
}, testInfo) => {
  const { email, slug } = await teamWithMember(testInfo);
  await signIn(page, email, baseURL!);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = collectConsoleErrors(page);
  for (const path of [`/ko/startups/${slug}/edit`, `/en/startups/${slug}/posts/new`]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
  }
  expect(errors).toEqual([]);
});
