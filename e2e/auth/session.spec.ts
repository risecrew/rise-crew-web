import { expect, test } from '@playwright/test';
import {
  authCookies,
  deleteAccount,
  expireSession,
  readSession,
  requestSignInLink,
  signIn,
} from './helpers';

test('a sign-in link signs the member in, and signing out ends the session', async ({
  page,
  baseURL,
}) => {
  const link = await requestSignInLink('member@example.test', baseURL!);

  await page.goto(link);
  await expect(page).toHaveURL(`${baseURL}/ko`);
  expect(authCookies(await page.context().cookies()).length).toBeGreaterThan(0);

  const signedOut = await page.request.post('/ko/auth/signout', { maxRedirects: 0 });
  expect(signedOut.status()).toBe(303);
  expect(new URL(signedOut.headers()['location'], baseURL!).pathname).toBe('/ko');
  expect(authCookies(await page.context().cookies())).toEqual([]);
});

// Links that cannot sign anyone in all end the same way: back to the login page with a notice.
for (const [name, path] of [
  ['a token that does not exist', '/ko/auth/confirm?token_hash=bad&type=email'],
  ['a link with no token', '/ko/auth/confirm?type=email'],
  ['a link of another kind', '/ko/auth/confirm?token_hash=bad&type=recovery'],
  ['a code that does not exist', '/ko/auth/callback?code=bad'],
  ['a callback with no code', '/ko/auth/callback'],
  ['the same in English', '/en/auth/confirm?token_hash=bad&type=email'],
] as const) {
  test(`${name} goes back to login with an error`, async ({ request, baseURL }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    const location = new URL(response.headers()['location'], baseURL!);
    expect(location.pathname + location.search).toBe(`/${path.slice(1, 3)}/login?error=link`);
  });
}

test('a first sign-in goes to the welcome form, carrying where the visitor was heading', async ({
  page,
  baseURL,
}, testInfo) => {
  const email = `newcomer-${testInfo.project.name}-${Date.now()}@example.test`;
  try {
    const link = await requestSignInLink(email, baseURL!, { next: '/ko/about' });

    await page.goto(link);
    await expect(page).toHaveURL(`${baseURL}/ko/welcome?next=%2Fko%2Fabout`);
    expect(authCookies(await page.context().cookies()).length).toBeGreaterThan(0);
  } finally {
    await deleteAccount(email);
  }
});

test('an expired access token is renewed by the proxy, which hands the browser the new session', async ({
  page,
  baseURL,
}) => {
  await signIn(page, 'member@example.test', baseURL!);
  const before = readSession(await page.context().cookies())!;

  await expireSession(page.context());
  await page.goto('/ko/about');

  const after = readSession(await page.context().cookies())!;
  expect(after.user.email).toBe('member@example.test');
  expect(after.expires_at).toBeGreaterThan(Date.now() / 1000);
  expect(after.refresh_token).not.toBe(before.refresh_token);
});

test('a sign-in link replaces an expired session of someone else', async ({ page, baseURL }) => {
  await signIn(page, 'member@example.test', baseURL!);
  await expireSession(page.context());

  await page.goto(await requestSignInLink('operator@example.test', baseURL!));
  await expect(page).toHaveURL(`${baseURL}/ko`);
  expect(readSession(await page.context().cookies())?.user.email).toBe('operator@example.test');
});

test('signing out works when the access token has already expired', async ({ page, baseURL }) => {
  await signIn(page, 'member@example.test', baseURL!);
  await expireSession(page.context());

  const signedOut = await page.request.post('/en/auth/signout', { maxRedirects: 0 });
  expect(signedOut.status()).toBe(303);
  expect(new URL(signedOut.headers()['location'], baseURL!).pathname).toBe('/en');
  expect(authCookies(await page.context().cookies())).toEqual([]);
});
