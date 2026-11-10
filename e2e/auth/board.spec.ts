import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { collectConsoleErrors, expectAccessible, expectNoHorizontalScroll } from '../helpers';
import { adminClient, createOnboardedAccount, deleteAccount, signIn } from './helpers';

// What operators publish and everyone reads: activities. Fake data on the local stack.
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

// The account links are behind the circle on a wide screen and in the menu panel on a phone.
async function openAccountLinks(page: Page) {
  await page
    .locator('header button[aria-controls="site-menu"]')
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
  await page.getByRole('link', { name: /Sushi Tech Tokyo 2026/ }).click();
  await expect(page.getByRole('img', { name: '지금 사진' })).toBeVisible();
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/activities$/);
  expect(await photoOf('Sushi Tech Tokyo 2026')).toBe(
    '/images/activities/sushi-tech-tokyo-2026.jpg',
  );
});

test('an operator approves one applicant and declines another, who is then deleted', async ({
  browser,
  baseURL,
}, testInfo) => {
  const id = unique(testInfo);
  const keep = `approve-${id}@example.test`;
  const drop = `decline-${id}@example.test`;
  const keepId = await createOnboardedAccount(keep, { role: 'applicant', names: ['승인', id] });
  await createOnboardedAccount(drop, { role: 'applicant', names: ['거절', id] });

  const page = await (await browser.newContext()).newPage();
  await signIn(page, OPERATOR, baseURL!);
  await page.goto('/ko/admin/members');
  await page.locator('[data-applicants]').click();
  await expect(page).toHaveURL(/role=applicant/);

  const row = (name: string) =>
    page
      .locator('tr, li')
      .filter({ hasText: `${name}${id}` })
      .filter({ hasText: '가입 신청 중' })
      .first();
  await row('승인').getByRole('checkbox').check();
  await page
    .getByRole('button', { name: /가입자로/ })
    .first()
    .click();
  await expect(page.getByText(/1명을 가입자로 바꿨어요/)).toBeVisible();
  const { data: role } = await adminClient()
    .from('user_roles')
    .select('role')
    .eq('user_id', keepId)
    .single();
  expect(role!.role).toBe('guest');

  // Only this applicant is listed, so declining empties the list: the answer is still said.
  await page.goto(`/ko/admin/members?role=applicant&q=${encodeURIComponent(drop)}`);
  await row('거절').getByRole('checkbox').check();
  await page
    .getByRole('button', { name: /가입 거절/ })
    .first()
    .click();
  await expect(page.getByText(/가입 신청을 거절할까요/)).toBeVisible();
  await page.getByRole('button', { name: '거절하고 삭제' }).click();
  await expect(page.getByText(/거절하고 삭제했어요/)).toBeVisible();
  await expect(page.getByText('조건에 맞는 회원이 없어요.')).toBeVisible();
  const { data: gone } = await adminClient().from('profiles').select('id').eq('email', drop);
  expect(gone).toEqual([]);

  // Someone already approved cannot be declined.
  await page.goto('/ko/admin/members');
  await page.getByRole('searchbox').fill(keep);
  await page.getByRole('searchbox').press('Enter');
  await page
    .locator('tr, li')
    .filter({ hasText: `승인${id}` })
    .first()
    .getByRole('checkbox')
    .check();
  await page
    .getByRole('button', { name: /가입 거절/ })
    .first()
    .click();
  await expect(page.getByText(/이미 승인된 계정/)).toBeVisible();
  const { data: stays } = await adminClient().from('profiles').select('id').eq('email', keep);
  expect(stays).toHaveLength(1);

  await deleteAccount(keep);
  await page.context().close();
});

test('the account menu leads operators to the activities screen', async ({ page, baseURL }) => {
  await signIn(page, OPERATOR, baseURL!);
  await page.goto('/ko');
  await openAccountLinks(page);
  await page.getByRole('link', { name: '활동 관리' }).first().click();
  await expect(page.getByRole('heading', { name: '활동 관리' })).toBeVisible();
  await expectAccessible(page);
});

test('nobody else reaches the screens or can write', async ({ page, baseURL }) => {
  await signIn(page, MEMBER, baseURL!);
  for (const path of ['activities', 'activities/new']) {
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
  await page.goto('/ko/admin/activities/new');
  await page.getByLabel('제목', { exact: true }).fill('강등 활동');
  await page.getByLabel('도시', { exact: true }).fill('서울');
  const { error } = await adminClient()
    .from('user_roles')
    .update({ role: 'member' })
    .eq('user_id', id);
  if (error) throw error;
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.getByRole('alert').getByText(/권한이 없어요/)).toBeVisible();
  const { data } = await adminClient().from('activities').select('id').eq('title_ko', '강등 활동');
  expect(data).toEqual([]);
  await deleteAccount(email);
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

test('each activity has a page: name, place and dates, results, and the ones around it', async ({
  page,
}) => {
  await page.goto('/ko/activities');
  const card = page.locator('[data-activity]', {
    hasText: '카카오모빌리티 × RISE CREW 라운드테이블 멘토링 워크숍',
  });
  await expect(card).toContainText('2026.01.23–01.24');
  // Anywhere on the card leads there, the photo included.
  await card.click({ position: { x: 24, y: 24 } });
  await expect(page).toHaveURL(/\/ko\/activities\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    '카카오모빌리티 × RISE CREW 라운드테이블 멘토링 워크숍',
  );
  await expect(page).toHaveTitle(/라운드테이블 멘토링 워크숍 \| RISE CREW 활동/);
  await expect(page.locator('figcaption')).toHaveText(
    '카카오모빌리티 × RISE CREW 라운드테이블 멘토링 워크숍 · 시흥 · 2026.01.23–01.24',
  );
  await expect(page.locator('section[aria-labelledby="results-title"] li')).toHaveText([
    '최우수상 안전상점',
    '우수상 MORTON·곁은',
  ]);
  const around = page.getByRole('navigation', { name: '다른 활동' });
  await expect(around.getByRole('link')).toHaveCount(2);
  await expectAccessible(page);
  await expectNoHorizontalScroll(page);

  await page.getByRole('link', { name: '← 활동 목록' }).click();
  await expect(page).toHaveURL(/\/ko\/activities$/);
});

test('an activity address that does not exist is a 404', async ({ request }) => {
  expect((await request.get('/ko/activities/7e5c0000-0000-4000-8000-000000000000')).status()).toBe(
    404,
  );
  expect((await request.get('/ko/activities/not-an-id')).status()).toBe(404);
});

test('an operator writes the end date, the text and the results, and the page shows them', async ({
  page,
  baseURL,
}, testInfo) => {
  const title = `상세 ${unique(testInfo)}`;
  await signIn(page, OPERATOR, baseURL!);
  await page.goto('/ko/admin/activities/new');
  await page.getByLabel('제목', { exact: true }).fill(title);
  await page.getByLabel('도시', { exact: true }).fill('서울');
  await page.getByLabel('날짜', { exact: true }).fill('2026-11-06');
  await page.getByLabel('끝난 날 (선택)').fill('2026-11-05');
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page.getByText('끝난 날은 시작 날짜와 같거나 뒤여야')).toBeVisible();

  await page.getByLabel('끝난 날 (선택)').fill('2026-11-07');
  await page.getByLabel('본문 (선택)', { exact: true }).fill('첫 줄\n둘째 줄');
  await page.getByLabel('성과 (선택)', { exact: true }).fill('대상 팀하나\n\n장려상 팀둘');
  await page.getByRole('button', { name: '저장' }).click();
  await expect(page).toHaveURL(/\/ko\/admin\/activities$/);

  const { data } = await adminClient()
    .from('activities')
    .select('id')
    .eq('title_ko', title)
    .single();
  await page.goto(`/ko/activities/${data!.id}`);
  await expect(page.getByText('2026.11.06–11.07')).toBeVisible();
  await expect(page.locator('main')).toContainText('첫 줄');
  await expect(page.locator('section[aria-labelledby="results-title"] li')).toHaveText([
    '대상 팀하나',
    '장려상 팀둘',
  ]);
  await cleanUpActivity(title);
});
