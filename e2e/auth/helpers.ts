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
export function adminClient() {
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

// What the database holds for an account: the profile row and its consent log, oldest first. The
// secret key reads them, so the check does not depend on what the site shows.
export async function accountRows(email: string) {
  const admin = adminClient();
  const { data: profile, error } = await admin
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();
  if (error) throw error;
  const { data: consents, error: consentError } = await admin
    .from('consents')
    .select('kind, granted, policy_version, created_at')
    .eq('user_id', profile.id)
    .order('id');
  if (consentError) throw consentError;
  return { profile, consents };
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

// Creates an account with a finished sign-up (names, an occupation, the privacy and age14 consents
// and optionally the recruit one) and, if asked, a role. It does the sign-up the way the form
// does: as the account itself, with its own session, because the secret key may not write
// profiles or consents. The session comes from a link made by the Auth admin API, so no email is
// sent. Remove it afterwards with deleteAccount. Returns the account's id.
export async function createOnboardedAccount(
  email: string,
  {
    role = 'guest',
    names = ['시험', '계정'],
    recruit = false,
    details = {},
  }: {
    role?: 'guest' | 'member' | 'operator' | 'admin';
    names?: [string, string];
    recruit?: boolean;
    // A student gives a school and a major; anyone else may give an affiliation.
    details?: {
      occupation?: 'undergrad' | 'grad' | 'alumni' | 'founder' | 'other';
      school?: string;
      major?: string;
      affiliation?: string;
    };
  } = {},
): Promise<string> {
  const admin = adminClient();
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error) throw created.error;
  const id = created.data.user.id;

  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (link.error) throw link.error;
  const own = anonymousClient();
  const verified = await own.auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: 'magiclink',
  });
  if (verified.error) throw verified.error;

  const consent = (kind: 'privacy' | 'age14' | 'recruit', granted: boolean) => ({
    user_id: id,
    kind,
    granted,
    policy_version: 'e2e',
  });
  const consents = await own
    .from('consents')
    .insert([consent('privacy', true), consent('age14', true), consent('recruit', recruit)]);
  if (consents.error) throw consents.error;
  const profile = await own
    .from('profiles')
    .update({
      last_name: names[0],
      first_name: names[1],
      occupation: 'founder',
      ...details,
      onboarded_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (profile.error) throw profile.error;

  if (role !== 'guest') {
    const set = await admin.from('user_roles').update({ role }).eq('user_id', id);
    if (set.error) throw set.error;
  }
  return id;
}

// The role row of an account: what the members screen is supposed to have written.
export async function roleRow(id: string) {
  const { data, error } = await adminClient()
    .from('user_roles')
    .select('role, blocked_at, updated_by')
    .eq('user_id', id)
    .single();
  if (error) throw error;
  return data;
}

// The id of the account with this address.
export async function accountId(email: string): Promise<string> {
  const { data, error } = await adminClient()
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();
  if (error) throw error;
  return data.id;
}

// Until when Auth refuses to sign this account in (null when it does not).
export async function bannedUntil(id: string): Promise<string | null> {
  const { data, error } = await adminClient().auth.admin.getUserById(id);
  if (error) throw error;
  return data.user.banned_until ?? null;
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
