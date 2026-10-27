import { expect, test } from '@playwright/test';

// The sign-in routes exist only when accounts are switched on. This suite runs with the switch
// off, so they must look like any other address that is not a page (the accounts e2e, in e2e/auth,
// covers them when they are on).
for (const path of ['/ko/auth/callback?code=x', '/ko/auth/confirm?token_hash=x&type=email']) {
  test(`${path} is a 404 while accounts are off`, async ({ request }) => {
    expect((await request.get(path, { maxRedirects: 0 })).status()).toBe(404);
  });
}

// The sign-up form is part of accounts too: no page, in either language.
for (const path of ['/ko/welcome', '/en/welcome', '/ko/welcome?next=%2Fko%2Fabout']) {
  test(`${path} is a 404 while accounts are off`, async ({ request }) => {
    expect((await request.get(path, { maxRedirects: 0 })).status()).toBe(404);
  });
}

// So is My page, with or without the edit step opened.
for (const path of ['/ko/me', '/en/me', '/ko/me?edit=1']) {
  test(`${path} is a 404 while accounts are off`, async ({ request }) => {
    expect((await request.get(path, { maxRedirects: 0 })).status()).toBe(404);
  });
}

test('signing out is a 404 while accounts are off', async ({ request }) => {
  expect((await request.post('/ko/auth/signout', { maxRedirects: 0 })).status()).toBe(404);
  expect((await request.get('/ko/auth/signout', { maxRedirects: 0 })).status()).toBe(404);
});

// The line the home page shows after an account was deleted belongs to accounts as well: with the
// switch off, the address does nothing.
test('?deleted=1 shows nothing on the home page while accounts are off', async ({ page }) => {
  await page.goto('/ko?deleted=1');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('탈퇴가 완료됐어요')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
});
