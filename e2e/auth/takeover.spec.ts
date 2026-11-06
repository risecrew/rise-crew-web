import { expect, test } from '@playwright/test';
import { adminClient, anonymousClient, deleteAccount } from './helpers';
import { clearMessagesFor, latestCodeFor } from './mailpit';

// Someone signs up with another person's address and a password of their own, straight at Auth with
// the public key, and waits for the owner of the mailbox to confirm it. The mail proves who owns the
// address and nothing about who chose the password, so that password must not survive it.
const PLANTED = 'planted-by-someone-else-1';

function address(name: string, testInfo: { project: { name: string } }) {
  return `${name}-${testInfo.project.name}-${Date.now()}@example.test`;
}

async function plantPassword(email: string) {
  const { error } = await anonymousClient().auth.signUp({ email, password: PLANTED });
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
    await plantPassword(email);
    expect((await tryPlanted(email)).error?.code).toBe('email_not_confirmed');

    // The owner signs up through the site, and gets on with choosing their own password.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await clearMessagesFor(email);
    await page.goto('/ko/signup');
    await page.getByLabel('이메일').fill(email);
    await page.getByRole('button', { name: '가입하기' }).click();
    await page.getByLabel('인증번호').fill(await latestCodeFor(email));
    await page.getByRole('button', { name: '확인', exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}/ko/reset-password?next=%2Fko&first=1`);

    expect((await tryPlanted(email)).error?.code).toBe('invalid_credentials');
  } finally {
    await deleteAccount(email);
  }
});

test('a reset code used and then left also ends a password set before confirmation', async ({
  page,
}, testInfo) => {
  const email = address('planted-reset', testInfo);
  try {
    await plantPassword(email);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await clearMessagesFor(email);
    await page.goto('/ko/forgot-password');
    await page.getByLabel('이메일').fill(email);
    await page.getByRole('button', { name: '인증번호 받기' }).click();
    await page.getByLabel('인증번호').fill(await latestCodeFor(email));
    await page.getByRole('button', { name: '확인', exact: true }).click();
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
