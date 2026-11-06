import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { collectConsoleErrors, expectAccessible, expectNoHorizontalScroll } from '../helpers';
import { adminClient, createOnboardedAccount, deleteAccount, signIn } from './helpers';

// What operators publish and everyone reads: activities and notices. Fake data on the local stack.
const OPERATOR = 'operator@example.test';
const MEMBER = 'member@example.test';

// The smallest JPEG a browser will decode, so the upload and shrink path runs for real.
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);

let counter = 0;
function unique(testInfo: TestInfo): string {
  counter += 1;
  return `${Date.now().toString(36)}-${testInfo.parallelIndex}${counter}`;
}

async function addActivity(
  page: Page,
  values: { title: string; city?: string; date?: string; summary?: string; photo?: boolean },
) {
  await page.goto('/ko/admin/activities/new');
  await page.getByLabel('제목', { exact: true }).fill(values.title);
  await page.getByLabel('도시', { exact: true }).fill(values.city ?? '서울');
  if (values.date) await page.getByLabel('날짜').fill(values.date);
  if (values.summary) await page.getByLabel('짧은 설명 (선택)').fill(values.summary);
  if (values.photo) {
    await page.getByLabel('사진 (선택, 한 장)').setInputFiles({
      name: 'photo.jpg',
      mimeType: 'image/jpeg',
      buffer: JPEG,
    });
  }
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/activities$/);
}

async function addNotice(page: Page, title: string, body = '본문입니다.', pinned = false) {
  await page.goto('/ko/admin/notices/new');
  await page.getByLabel('제목', { exact: true }).fill(title);
  await page.getByLabel('본문', { exact: true }).fill(body);
  if (pinned) await page.getByLabel('맨 위에 고정').check();
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/notices$/);
}

// The account links are behind the circle on a wide screen and in the menu panel on a phone.
async function openAccountLinks(page: Page) {
  await page
    .locator('header summary')
    .or(page.getByRole('button', { name: /계정 메뉴/ }))
    .locator('visible=true')
    .first()
    .click();
}

async function photoOf(title: string): Promise<string | null> {
  const { data, error } = await adminClient()
    .from('activities')
    .select('photo')
    .eq('title_ko', title)
    .single();
  if (error) throw error;
  return data.photo;
}

async function fileExists(name: string): Promise<boolean> {
  const { data, error } = await adminClient()
    .storage.from('activity-photos')
    .list('', { search: name });
  if (error) throw error;
  return data.some((file) => file.name === name);
}

async function cleanUpActivity(title: string) {
  await adminClient().from('activities').delete().eq('title_ko', title);
}

test('an activity goes up with its photo and everyone can read it, in both languages', async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  const title = `활동 ${unique(testInfo)}`;
  await signIn(page, OPERATOR, baseURL!);
  await addActivity(page, {
    title,
    city: '도쿄',
    date: '2026-03',
    summary: '짧은 설명입니다.',
    photo: true,
  });
  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
  const photo = await photoOf(title);
  expect(photo).toMatch(/^[0-9a-f-]{36}\.(jpg|png|webp)$/);

  const visitor = await (await browser.newContext()).newPage();
  const errors = collectConsoleErrors(visitor);
  await visitor.goto('/ko/activities');
  const card = visitor.locator('[data-activity]', { hasText: title });
  await expect(card).toContainText('도쿄');
  await expect(card).toContainText('짧은 설명입니다.');
  await expect(card.getByRole('img', { name: title })).toBeVisible();
  await expectAccessible(visitor);
  await expectNoHorizontalScroll(visitor);

  // No English was written, so the English page shows the Korean rather than a blank.
  await visitor.goto('/en/activities');
  const english = visitor.locator('[data-activity]', { hasText: title });
  await expect(english.getByRole('heading', { name: title })).toHaveAttribute('lang', 'ko');
  await expect(english).toContainText('도쿄');

  await visitor.goto('/ko/about');
  await expect(visitor.locator('[data-event]', { hasText: title })).toContainText('도쿄');
  expect(errors).toEqual([]);
  await visitor.context().close();
  await cleanUpActivity(title);
  await adminClient().storage.from('activity-photos').remove([photo!]);
});

test('English shows where it was written', async ({ page, baseURL }, testInfo) => {
  const title = `영어 활동 ${unique(testInfo)}`;
  const english = `English activity ${unique(testInfo)}`;
  await signIn(page, OPERATOR, baseURL!);
  await page.goto('/ko/admin/activities/new');
  await page.getByLabel('제목', { exact: true }).fill(title);
  await page.getByLabel('제목 (영어, 선택)').fill(english);
  await page.getByLabel('도시', { exact: true }).fill('서울');
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/activities$/);

  await page.goto('/en/activities');
  await expect(page.getByRole('heading', { name: english })).toBeVisible();
  await expect(page.getByRole('heading', { name: title })).toHaveCount(0);
  await cleanUpActivity(title);
});

test('a planned activity says so, and an activity without a title or a real date is refused', async ({
  page,
  baseURL,
}, testInfo) => {
  const title = `예정 ${unique(testInfo)}`;
  await signIn(page, OPERATOR, baseURL!);

  await page.goto('/ko/admin/activities/new');
  await page.getByLabel('날짜').fill('2026-13');
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.getByText('꼭 입력해 주세요.').first()).toBeVisible();
  await expect(page.getByText(/실제 있는 날짜/)).toBeVisible();
  await expect(page.getByLabel('날짜')).toHaveValue('2026-13');

  await page.getByLabel('제목', { exact: true }).fill(title);
  await page.getByLabel('도시', { exact: true }).fill('서울');
  await page.getByLabel('날짜').fill('2999-01');
  await page.getByLabel('아직 안 열린 행사').check();
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/activities$/);

  await page.goto('/ko/activities');
  await expect(page.locator('[data-activity]', { hasText: title })).toHaveAttribute(
    'data-state',
    'upcoming',
  );
  await cleanUpActivity(title);
});

test('changing a photo removes the old file, and deleting an activity removes its file and its card', async ({
  page,
  baseURL,
}, testInfo) => {
  const title = `사진 ${unique(testInfo)}`;
  await signIn(page, OPERATOR, baseURL!);
  await addActivity(page, { title, photo: true });
  const first = (await photoOf(title))!;
  expect(await fileExists(first)).toBe(true);

  await page.getByRole('link', { name: new RegExp(title) }).click();
  await page.getByLabel('사진 (선택, 한 장)').setInputFiles({
    name: 'other.jpg',
    mimeType: 'image/jpeg',
    buffer: JPEG,
  });
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/activities$/);
  const second = (await photoOf(title))!;
  expect(second).not.toBe(first);
  expect(await fileExists(first)).toBe(false);
  expect(await fileExists(second)).toBe(true);

  await page.getByRole('link', { name: new RegExp(title) }).click();
  await page.getByRole('button', { name: '지우기' }).click();
  await expect(page.getByText('이 활동을 지울까요?')).toBeVisible();
  await page.getByRole('button', { name: '지우기' }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/activities$/);
  await expect(page.getByRole('link', { name: new RegExp(title) })).toHaveCount(0);
  expect(await fileExists(second)).toBe(false);

  await page.goto('/ko/activities');
  await expect(page.locator('[data-activity]', { hasText: title })).toHaveCount(0);
});

test('activities moved from the code can be edited and keep their photo', async ({
  page,
  baseURL,
}) => {
  await signIn(page, OPERATOR, baseURL!);
  await page.goto('/ko/admin/activities');
  await page.getByRole('link', { name: /Sushi Tech Tokyo 2026 참가/ }).click();
  await expect(page.getByRole('img', { name: '지금 사진' })).toBeVisible();
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/activities$/);
  expect(await photoOf('Sushi Tech Tokyo 2026 참가')).toBe(
    '/images/activities/sushi-tech-tokyo-2026.jpg',
  );
});

test('a notice goes up, stays pinned on top, can be changed, and can be deleted', async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  const id = unique(testInfo);
  const pinned = `고정 공지 ${id}`;
  const plain = `일반 공지 ${id}`;
  await signIn(page, OPERATOR, baseURL!);
  await addNotice(page, pinned, '고정 본문 https://example.test/a', true);
  await addNotice(page, plain, '줄 하나\n줄 둘');

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto('/ko/notices');
  const rows = visitor.locator('[data-notice]');
  const texts = await rows.allInnerTexts();
  const [first, second] = [pinned, plain].map((title) =>
    texts.findIndex((text) => text.includes(title)),
  );
  expect(first).toBeGreaterThanOrEqual(0);
  expect(second).toBeGreaterThan(first);
  await expect(rows.filter({ hasText: pinned })).toContainText('고정');
  await expectAccessible(visitor);

  await rows.filter({ hasText: pinned }).getByRole('link').click();
  await expect(visitor.getByRole('heading', { name: pinned })).toBeVisible();
  await expect(visitor.getByRole('link', { name: 'https://example.test/a' })).toHaveAttribute(
    'rel',
    /nofollow/,
  );

  await visitor.goto(visitor.url().replace('/ko/', '/en/'));
  await expect(visitor.getByRole('heading', { name: pinned })).toHaveAttribute('lang', 'ko');
  const noticeUrl = visitor.url();

  await page.getByRole('link', { name: new RegExp(pinned) }).click();
  await page.getByLabel('제목', { exact: true }).fill(`${pinned} 수정`);
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/notices$/);
  await visitor.goto(noticeUrl);
  await expect(visitor.getByRole('heading', { name: `${pinned} 수정` })).toBeVisible();

  await page.getByRole('link', { name: new RegExp(pinned) }).click();
  await page.getByRole('button', { name: '지우기' }).click();
  await page.getByRole('button', { name: '지우기' }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/notices$/);
  expect((await visitor.request.get(noticeUrl)).status()).toBe(404);
  await visitor.context().close();
  await adminClient().from('notices').delete().eq('title_ko', plain);
});

test('a notice over the length limit is refused with what was typed left in place', async ({
  page,
  baseURL,
}) => {
  await signIn(page, OPERATOR, baseURL!);
  await page.goto('/ko/admin/notices/new');
  await page.getByLabel('제목', { exact: true }).fill('긴 공지');
  await page.getByLabel('본문', { exact: true }).fill('가'.repeat(5001));
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.getByText('글자 수가 너무 많아요.')).toBeVisible();
  await expect(page.getByLabel('제목', { exact: true })).toHaveValue('긴 공지');
});

test('a notice address that does not exist is a 404', async ({ request }) => {
  for (const id of ['00000000-0000-4000-8000-000000000000', 'not-a-uuid']) {
    expect((await request.get(`/ko/notices/${id}`)).status()).toBe(404);
  }
});

test('the account menu leads operators to both screens', async ({ page, baseURL }) => {
  await signIn(page, OPERATOR, baseURL!);
  await page.goto('/ko');
  await openAccountLinks(page);
  await page.getByRole('link', { name: '활동 관리' }).first().click();
  await expect(page.getByRole('heading', { name: '활동 관리' })).toBeVisible();
  await expectAccessible(page);
  await page.goto('/ko');
  await openAccountLinks(page);
  await page.getByRole('link', { name: '공지 관리' }).first().click();
  await expect(page.getByRole('heading', { name: '공지 관리' })).toBeVisible();
  await expectAccessible(page);
});

test('nobody else reaches the screens or can write', async ({ page, baseURL }) => {
  await signIn(page, MEMBER, baseURL!);
  for (const path of ['activities', 'activities/new', 'notices', 'notices/new']) {
    await page.goto(`/ko/admin/${path}`);
    await expect(page.getByRole('heading', { name: /관리|올리기|쓰기/ })).toHaveCount(0);
  }
  await page.goto('/ko');
  await openAccountLinks(page);
  await expect(page.getByRole('link', { name: '활동 관리' })).toHaveCount(0);
});

test('someone demoted mid-form is refused, and the photo does not stay behind', async ({
  page,
  baseURL,
}, testInfo) => {
  const email = `demoted-${unique(testInfo)}@example.test`;
  const id = await createOnboardedAccount(email, { role: 'operator' });
  await signIn(page, email, baseURL!);
  await page.goto('/ko/admin/notices/new');
  await page.getByLabel('제목', { exact: true }).fill('강등 공지');
  await page.getByLabel('본문', { exact: true }).fill('본문');
  const { error } = await adminClient()
    .from('user_roles')
    .update({ role: 'member' })
    .eq('user_id', id);
  if (error) throw error;
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.getByRole('alert').getByText(/권한이 없어요/)).toBeVisible();
  const { data } = await adminClient().from('notices').select('id').eq('title_ko', '강등 공지');
  expect(data).toEqual([]);
  await deleteAccount(email);
});

async function noticeFilesExist(paths: string[]): Promise<boolean[]> {
  const { data, error } = await adminClient()
    .storage.from('notice-files')
    .list('', { limit: 1000 });
  if (error) throw error;
  const names = new Set(data.map((file) => file.name));
  return paths.map((path) => names.has(path));
}

test('a notice carries photos and files, which download under their name and go when they are removed', async ({
  page,
  browser,
  baseURL,
}, testInfo) => {
  const title = `첨부 공지 ${unique(testInfo)}`;
  await signIn(page, OPERATOR, baseURL!);
  await page.goto('/ko/admin/notices/new');
  await expect(page.getByText(/개인정보가 든 파일은 올리지 마세요/)).toBeVisible();
  await page.getByLabel('제목', { exact: true }).fill(title);
  await page.getByLabel('본문', { exact: true }).fill('본문입니다.');

  // A page is refused where the file was picked, and nothing is added.
  await page.getByLabel(/첨부 파일/).setInputFiles({
    name: 'evil.html',
    mimeType: 'text/html',
    buffer: Buffer.from('<script>alert(1)</script>'),
  });
  await expect(page.getByText(/올릴 수 없는 형식/)).toBeVisible();

  await page.getByLabel(/^사진/).setInputFiles({
    name: 'photo.jpg',
    mimeType: 'image/jpeg',
    buffer: JPEG,
  });
  await page.getByLabel(/첨부 파일/).setInputFiles([
    { name: '모집 안내.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') },
    // Browsers often send a Hangul file with no type at all.
    { name: '지원서.hwp', mimeType: '', buffer: Buffer.from('hwp test') },
  ]);
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/notices$/);

  const { data, error } = await adminClient()
    .from('notices')
    .select('id, photo_paths, attachments')
    .eq('title_ko', title)
    .single();
  if (error) throw error;
  const files = data.attachments as { path: string; name: string }[];
  expect(files.map((file) => file.name)).toEqual(['모집 안내.pdf', '지원서.hwp']);
  expect(data.photo_paths).toHaveLength(1);

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`/ko/notices/${data.id}`);
  await expect(visitor.getByRole('img', { name: `${title} 사진 1` })).toBeVisible();
  const link = visitor.getByRole('link', { name: /모집 안내\.pdf/ });
  const response = await visitor.request.get((await link.getAttribute('href'))!);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-disposition']).toContain('attachment');
  await expectAccessible(visitor);
  await expectNoHorizontalScroll(visitor);

  // The list says there is something attached.
  await visitor.goto('/ko/notices');
  await expect(visitor.locator('[data-notice]', { hasText: title })).toContainText('첨부');

  // Removing one file on the edit screen removes it from Storage, and keeps the rest.
  await page.goto(`/ko/admin/notices/${data.id}`);
  await page.getByRole('button', { name: '모집 안내.pdf 빼기' }).click();
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/notices$/);
  expect(await noticeFilesExist([files[0].path, files[1].path, data.photo_paths[0]])).toEqual([
    false,
    true,
    true,
  ]);

  // Deleting the notice takes the rest with it.
  await page.goto(`/ko/admin/notices/${data.id}`);
  await page.getByRole('button', { name: '지우기' }).click();
  await page.getByRole('button', { name: '지우기' }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/notices$/);
  expect(await noticeFilesExist([files[1].path, data.photo_paths[0]])).toEqual([false, false]);
  await visitor.context().close();
});

test('an activity without a photo shows the club mark instead of a word', async ({ page }) => {
  await page.goto('/ko/activities');
  const card = page.locator('[data-activity]', { hasText: '글로벌 IR과 pre-SEED 투자 유치' });
  await expect(card.locator('[data-activity-mark] svg')).toBeVisible();
  await expect(card.locator('[data-activity-mark]')).toHaveText('');
  // The same shape as a photo, so a row of cards stays level.
  const box = await card.locator('[data-activity-mark]').boundingBox();
  expect(box!.width / box!.height).toBeCloseTo(1.5, 1);
});

test('a refused activity keeps the picked photo and the tick, and the next save uses them', async ({
  page,
  baseURL,
}, testInfo) => {
  const title = `거절 ${unique(testInfo)}`;
  await signIn(page, OPERATOR, baseURL!);
  await page.goto('/ko/admin/activities/new');
  await page.getByLabel('사진 (선택, 한 장)').setInputFiles({
    name: 'photo.jpg',
    mimeType: 'image/jpeg',
    buffer: JPEG,
  });
  await page.getByLabel('아직 안 열린 행사').check();
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.getByText('꼭 입력해 주세요.').first()).toBeVisible();

  await expect(page.getByLabel('아직 안 열린 행사')).toBeChecked();
  await page.getByLabel('제목', { exact: true }).fill(title);
  await page.getByLabel('도시', { exact: true }).fill('서울');
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/activities$/);

  const { data, error } = await adminClient()
    .from('activities')
    .select('photo, is_planned')
    .eq('title_ko', title)
    .single();
  if (error) throw error;
  expect(data.photo).toMatch(/^[0-9a-f-]{36}\.jpg$/);
  expect(data.is_planned).toBe(true);
  await cleanUpActivity(title);
  await adminClient().storage.from('activity-photos').remove([data.photo!]);
});

test('removing the photo also cancels one just picked', async ({ page, baseURL }, testInfo) => {
  const title = `사진 빼기 ${unique(testInfo)}`;
  await signIn(page, OPERATOR, baseURL!);
  await addActivity(page, { title, photo: true });
  const first = (await photoOf(title))!;

  await page.getByRole('link', { name: new RegExp(title) }).click();
  await page.getByLabel('사진 (선택, 한 장)').setInputFiles({
    name: 'other.jpg',
    mimeType: 'image/jpeg',
    buffer: JPEG,
  });
  await page.getByRole('button', { name: '사진 빼기' }).click();
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/activities$/);
  expect(await photoOf(title)).toBeNull();
  expect(await fileExists(first)).toBe(false);
  await cleanUpActivity(title);
});

test('a refused notice keeps the pin', async ({ page, baseURL }) => {
  await signIn(page, OPERATOR, baseURL!);
  await page.goto('/ko/admin/notices/new');
  await page.getByLabel('맨 위에 고정').check();
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.getByText('꼭 입력해 주세요.').first()).toBeVisible();
  await expect(page.getByLabel('맨 위에 고정')).toBeChecked();
});
