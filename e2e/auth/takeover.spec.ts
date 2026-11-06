import { expect, test } from '@playwright/test';
import { adminClient, anonymousClient, deleteAccount } from './helpers';
import { latestLinkFor } from './mailpit';

// Someone signs up with another person's address and a password of their own, straight at Auth with
// the public key, and waits for the owner of the mailbox to confirm it. The mail proves who owns the
// address and nothing about who chose the password, so that password must not survive it.
const PLANTED = 'planted-by-someone-else-1';

function address(name: string, testInfo: { project: { name: string } }) {
  return `${name}-${testInfo.project.name}-${Date.now()}@example.test`;
}

async function plantPassword(email: string, origin: string) {
  const { error } = await anonymousClient().auth.signUp({
    email,
    password: PLANTED,
    options: { emailRedirectTo: `${origin}/ko/auth/confirm?next=%2Fko` },
  });
  expect(error).toBeNull();
}

function tryPlanted(email: string) {
  return anonymousClient().auth.signInWithPassword({ email, password: PLANTED });
}

test('a password set before the address was confirmed stops working when it is confirmed', async ({
  page,
  baseURL,
}, testInfo) => {
  const email = address('planted', testInfo);
  try {
    await plantPassword(email, baseURL!);
    expect((await tryPlanted(email)).error?.code).toBe('email_not_confirmed');

    await page.goto(await latestLinkFor(email));
    await page.waitForLoadState('networkidle');

    expect((await tryPlanted(email)).error?.code).toBe('invalid_credentials');
  } finally {
    await deleteAccount(email);
  }
});

test('a reset link opened and then left also ends a password set before confirmation', async ({
  page,
  baseURL,
}, testInfo) => {
  const email = address('planted-reset', testInfo);
  try {
    await plantPassword(email, baseURL!);
    await latestLinkFor(email);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const { error } = await anonymousClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${baseURL}/ko/auth/confirm?next=%2Fko`,
    });
    expect(error).toBeNull();
    await expect
      .poll(async () => new URL(await latestLinkFor(email)).searchParams.get('type'))
      .toBe('recovery');

    await page.goto(await latestLinkFor(email));
    await expect(page).toHaveURL(/\/ko\/reset-password/);

    expect((await tryPlanted(email)).error?.code).toBe('invalid_credentials');
  } finally {
    await deleteAccount(email);
  }
});

test('a password set after the address was confirmed keeps working', async ({}, testInfo) => {
  const email = address('after', testInfo);
  try {
    const admin = adminClient();
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    expect(error).toBeNull();
    const updated = await admin.auth.admin.updateUserById(data.user!.id, { password: PLANTED });
    expect(updated.error).toBeNull();
    expect((await tryPlanted(email)).error).toBeNull();
  } finally {
    await deleteAccount(email);
  }
});
