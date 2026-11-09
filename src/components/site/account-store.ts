import type { Session } from '@supabase/supabase-js';
import type { Locale } from '@/i18n/locales';
import { readTokenClaims } from '@/lib/auth/claims';
import { displayName, initial } from '@/lib/auth/name';
import type { AppRole } from '@/lib/auth/roles';
import type { createSupabaseBrowserClient } from '@/lib/supabase/browser';

type Client = ReturnType<typeof createSupabaseBrowserClient>;

// Who the header thinks is signed in. This is for display only: it is read in the browser from
// the session cookie and the visitor's own profile row, so the public pages stay static. Nothing
// here protects anything; every page and action that matters asks the server.

type NameParts = { last_name: string | null; first_name: string | null };

// The teams the visitor belongs to, for the menu's way into them.
export type MyTeam = { slug: string; name: string };

export type Account =
  | { status: 'out' }
  | { status: 'in'; role: AppRole; email: string; names: NameParts; teams: MyTeam[] };

const SIGNED_OUT: Account = { status: 'out' };

let current: Account = SIGNED_OUT;
let started = false;
// Each report from Supabase takes a moment to finish (the profile is read from the database); only
// the newest one may publish, or a slow sign-in could overwrite a sign-out that came after it.
let latest = 0;
// The names and teams last read, so a refreshed token does not read them again.
let known: { id: string; names: NameParts; teams: MyTeam[] } | null = null;
// The Supabase client, once the store has started (there is a session to look up).
let client: Client | null = null;
const listeners = new Set<() => void>();

function sameAccount(a: Account, b: Account): boolean {
  if (a.status === 'out' || b.status === 'out') return a.status === b.status;
  return a.role === b.role && a.email === b.email && a.names === b.names && a.teams === b.teams;
}

function publish(next: Account) {
  // A token refresh reports the same account again; keeping the old snapshot spares every
  // subscriber a re-render.
  if (sameAccount(current, next)) return;
  current = next;
  for (const listener of listeners) listener();
}

// Supabase keeps the session in `sb-<project>-auth-token` cookies (split into `.0`, `.1` when
// long). With none of them there is nobody to look up, and the Supabase client never loads.
function hasSessionCookie(): boolean {
  return /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/.test(document.cookie);
}

async function apply(supabase: Client, session: Session | null) {
  const mine = ++latest;
  const claims = session ? readTokenClaims(session.access_token) : null;
  // A blocked account looks signed out, whatever else the token says.
  if (!session || !claims || claims.blocked) {
    publish(SIGNED_OUT);
    return;
  }

  let found = known?.id === session.user.id ? known : null;
  if (!found) {
    // The database answers only with the visitor's own team rows, and only teams they can see.
    const [profile, membership] = await Promise.all([
      supabase
        .from('profiles')
        .select('last_name, first_name')
        .eq('id', session.user.id)
        .maybeSingle(),
      supabase.from('team_members').select('teams(slug, name)').eq('user_id', session.user.id),
    ]);
    const teams = (membership.data ?? [])
      .flatMap((row) => (row.teams ? [row.teams] : []))
      .sort((a, b) => a.name.localeCompare(b.name));
    found = {
      id: session.user.id,
      names: profile.data ?? { last_name: null, first_name: null },
      teams,
    };
    // A failed read is not remembered, so the next report tries again.
    if (!profile.error && !membership.error) known = found;
  }
  if (mine !== latest) return;
  publish({
    status: 'in',
    role: claims.role,
    email: session.user.email ?? '',
    names: found.names,
    teams: found.teams,
  });
}

async function start() {
  if (!hasSessionCookie()) return;

  // The Supabase client is a separate download that only visitors with a session ever fetch.
  const { createSupabaseBrowserClient } = await import('@/lib/supabase/browser');
  const supabase = createSupabaseBrowserClient();
  client = supabase;
  // This reports the current session right away and again on every sign-in, sign-out and token
  // refresh. The callback must not call back into Supabase itself, so the work waits a tick.
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => void apply(supabase, session), 0);
  });
}

// The names the header remembers are the ones it read when the visitor signed in, so they go out
// of date when the visitor's profile changes: a sign-up that has just been finished (the profile
// had no name yet), or a name edited later. Whoever saves the profile calls this afterwards, and
// the header reads the profile again and shows the new initial without a page reload.
export function refreshAccount() {
  known = null;
  const supabase = client;
  if (!supabase) return;
  void supabase.auth.getSession().then(({ data }) => apply(supabase, data.session));
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!started) {
    started = true;
    void start();
  }
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): Account {
  return current;
}

// The server and the first render in the browser never know: they show the sign-in link.
export function getServerSnapshot(): Account {
  return SIGNED_OUT;
}

// What the header calls the account: the name from the profile, or the address when the profile
// has none yet (a sign-up that was not finished).
export function accountLabel(account: Extract<Account, { status: 'in' }>, locale: Locale) {
  const name = displayName(account.names, locale);
  const letter = initial(account.names) || (Array.from(account.email)[0] ?? '').toLocaleUpperCase();
  return { name: name || account.email, initial: letter };
}
