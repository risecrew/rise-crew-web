import { createClient } from '@supabase/supabase-js';
import { expect, type BrowserContext, type Cookie, type Page } from '@playwright/test';
import { clearMessagesFor, latestLinkFor } from './mailpit';

// The local stack's address and keys, put in the environment by playwright.auth.config.ts.
function localEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set: run these tests with \`pnpm e2e:auth\`.`);
  return value;
}

function anonymousClient() {
  return createClient(localEnv('E2E_SUPABASE_URL'), localEnv('E2E_SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// Asks the local Supabase Auth for a sign-in email, the way the login form does, and returns the
// link from it. `emailRedirectTo` names this site (`origin`, the server under test) and always
// holds a "?": the email template adds the token to it with "&token_hash=...".
export async function requestSignInLink(
  email: string,
  origin: string,
  { locale = 'ko', next = `/${locale}` }: { locale?: string; next?: string } = {},
): Promise<string> {
  await clearMessagesFor(email);
  const options = {
    emailRedirectTo: `${origin}/${locale}/auth/confirm?next=${encodeURIComponent(next)}`,
  };

  // Auth lets one account ask for an email once a second. Two tests in a row can land inside that
  // second, so a refusal for that reason is retried.
  for (let attempt = 1; ; attempt++) {
    const { error } = await anonymousClient().auth.signInWithOtp({ email, options });
    if (!error) break;
    if (error.code !== 'over_email_send_rate_limit' || attempt === 4) throw error;
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
  return latestLinkFor(email);
}

// Signs `page` in through an emailed link and waits for the page to go quiet. Right after landing,
// the router prefetches the other pages, and a prefetch that is still running when a test changes
// the session would answer with cookies of its own and undo the change.
export async function signIn(page: Page, email: string, origin: string): Promise<void> {
  await page.goto(await requestSignInLink(email, origin));
  await expect(page).toHaveURL(`${origin}/ko`);
  await page.waitForLoadState('networkidle');
}

// A client with the stack's secret key, which only this test process knows. Tests use it to set up
// and clean up accounts; the site never sees the key.
function adminClient() {
  return createClient(localEnv('E2E_SUPABASE_URL'), localEnv('E2E_SUPABASE_SECRET_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Removes an account a test created. The seeded example accounts are never deleted.
export async function deleteAccount(email: string): Promise<void> {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  const user = data.users.find((u) => u.email === email);
  if (user) await admin.auth.admin.deleteUser(user.id);
}

// Creates an account that is already blocked. Its sign-in links still work, so the session it gets
// carries `blocked: true` in the token, which is how the site finds out. Remove it afterwards with
// deleteAccount.
export async function createBlockedAccount(email: string): Promise<void> {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const { error: blockError } = await admin
    .from('user_roles')
    .update({ blocked_at: new Date().toISOString() })
    .eq('user_id', data.user.id);
  if (blockError) throw blockError;
}

// The cookies that hold the Supabase session: `sb-<project>-auth-token`, split into `.0`, `.1`...
// when too long for one cookie.
export function authCookies(cookies: Cookie[]): Cookie[] {
  return cookies.filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name));
}

type StoredSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email: string };
};

const COOKIE_PREFIX = 'base64-';

// The session that @supabase/ssr keeps in the cookies: JSON, base64url-encoded behind a "base64-"
// marker, cut into numbered chunks when it does not fit in one cookie.
export function readSession(cookies: Cookie[]): StoredSession | null {
  const chunks = authCookies(cookies).sort((a, b) => a.name.localeCompare(b.name));
  if (chunks.length === 0) return null;
  const value = chunks.map((c) => c.value).join('');
  return JSON.parse(
    Buffer.from(value.slice(COOKIE_PREFIX.length), 'base64url').toString('utf8'),
  ) as StoredSession;
}

// Rewrites the stored session so its access token counts as expired. The refresh token stays
// valid, so the next request has to trade it for a new pair, which is what the proxy is for.
export async function expireSession(context: BrowserContext): Promise<void> {
  const cookies = await context.cookies();
  const chunks = authCookies(cookies);
  const session = readSession(cookies);
  if (!session || chunks.length === 0) throw new Error('There is no session to expire.');

  session.expires_at = Math.floor(Date.now() / 1000) - 3600;
  const value = COOKIE_PREFIX + Buffer.from(JSON.stringify(session)).toString('base64url');
  // The whole value goes into one unnumbered cookie, which the client reads before any chunks.
  const base = chunks[0].name.replace(/\.\d+$/, '');
  await context.clearCookies({ name: /^sb-.+-auth-token(\.\d+)?$/ });
  await context.addCookies([{ ...chunks[0], name: base, value }]);
}
