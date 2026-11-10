import { createClient } from '@supabase/supabase-js';
import { expect, type BrowserContext, type Cookie, type Page } from '@playwright/test';

// The local stack's address and keys, put in the environment by playwright.auth.config.ts.
function localEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set: run these tests with \`pnpm e2e:auth\`.`);
  return value;
}

export function anonymousClient() {
  return createClient(localEnv('E2E_SUPABASE_URL'), localEnv('E2E_SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// A one-time sign-in link for `email`, made by the Auth admin API, so no mail goes out. It makes the
// account if there is none. The mails carry codes; tests that are about them enter the code. `origin`
// is the server under test.
export async function requestSignInLink(
  email: string,
  origin: string,
  { locale = 'ko', next = `/${locale}` }: { locale?: string; next?: string } = {},
): Promise<string> {
  const { data, error } = await adminClient().auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw error;
  const query = new URLSearchParams({
    next,
    token_hash: data.properties.hashed_token,
    type: 'email',
  });
  return `${origin}/${locale}/auth/confirm?${query}`;
}

// Signs `page` in through a one-time link and waits for the page to go quiet. Right after landing,
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

// A client with an account's own session. The session comes from a link made by the Auth admin API,
// so no email is sent. The team tables give the secret key nothing, so tests set them up the way the
// site does: as an account that is allowed to.
export async function clientSignedInAs(email: string) {
  const link = await adminClient().auth.admin.generateLink({ type: 'magiclink', email });
  if (link.error) throw link.error;
  const client = anonymousClient();
  const verified = await client.auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: 'magiclink',
  });
  if (verified.error) throw verified.error;
  return client;
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
    role?: 'applicant' | 'guest' | 'member' | 'operator' | 'admin';
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

  const own = await clientSignedInAs(email);

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

  if (role !== 'applicant') {
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

// Team spaces. Tests cannot delete a team (nobody can), so names and addresses are made unique by
// the caller, and a test that needs to find its teams in the list filters by its own cohort.
const TEAM_OPERATOR = 'operator@example.test';

export async function createTeam(values: {
  slug: string;
  name: string;
  cohort: number;
  field?: string;
  tagline?: string;
  intro?: string;
  links?: { kind: string; url: string }[];
  is_published?: boolean;
}): Promise<string> {
  const operator = await clientSignedInAs(TEAM_OPERATOR);
  const { data, error } = await operator
    .from('teams')
    .insert({ field: 'other', is_published: true, ...values })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function addTeamMember(teamId: string, email: string): Promise<void> {
  const operator = await clientSignedInAs(TEAM_OPERATOR);
  const { error } = await operator
    .from('team_members')
    .insert({ team_id: teamId, user_id: await accountId(email) });
  if (error) throw error;
}

export async function removeTeamMember(teamId: string, email: string): Promise<void> {
  const operator = await clientSignedInAs(TEAM_OPERATOR);
  const { error } = await operator
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', await accountId(email));
  if (error) throw error;
}

export async function setRole(email: string, role: 'guest' | 'member' | 'operator'): Promise<void> {
  const { error } = await adminClient()
    .from('user_roles')
    .update({ role })
    .eq('user_id', await accountId(email));
  if (error) throw error;
}

// A post written by a team member, as that member. Returns its id.
export async function createPost(
  email: string,
  teamId: string,
  values: { title: string; body?: string; visibility?: 'public' | 'signed_in' },
): Promise<string> {
  const member = await clientSignedInAs(email);
  const { data, error } = await member
    .from('team_posts')
    .insert({ team_id: teamId, author_id: await accountId(email), ...values })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

// A post as whoever is asked (the operator by default), for checks and for hiding.
export async function hidePost(id: string): Promise<void> {
  const operator = await clientSignedInAs(TEAM_OPERATOR);
  const { error } = await operator
    .from('team_posts')
    .update({ hidden_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// An account that signs in with a password: confirmed, with no sign-up form filled in yet. The
// password is a throwaway for the local stack. Remove it afterwards with deleteAccount.
export const TEST_PASSWORD = 'local-test-pass-1';

export async function createPasswordAccount(email: string): Promise<string> {
  // Two steps: Auth confirms a new account in a write of its own, and the trigger that clears a
  // password set before confirmation cannot tell that one apart from anybody else's.
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const updated = await admin.auth.admin.updateUserById(data.user.id, { password: TEST_PASSWORD });
  if (updated.error) throw updated.error;
  return data.user.id;
}

// Gives an account that already exists the throwaway password.
export async function setTestPassword(email: string): Promise<string> {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  const user = data.users.find((u) => u.email === email);
  if (!user) throw new Error(`No account for ${email}.`);
  const updated = await admin.auth.admin.updateUserById(user.id, { password: TEST_PASSWORD });
  if (updated.error) throw updated.error;
  return user.id;
}
