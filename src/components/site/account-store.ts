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

export type Account =
  { status: 'out' } | { status: 'in'; role: AppRole; email: string; names: NameParts };

const SIGNED_OUT: Account = { status: 'out' };

let current: Account = SIGNED_OUT;
let started = false;
// Each report from Supabase takes a moment to finish (the profile is read from the database); only
// the newest one may publish, or a slow sign-in could overwrite a sign-out that came after it.
let latest = 0;
// The names of the last profile read, so a refreshed token does not read the row again.
let known: { id: string; names: NameParts } | null = null;
// The Supabase client, once the store has started (there is a session to look up).
let client: Client | null = null;
const listeners = new Set<() => void>();

function publish(next: Account) {
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

  let names = known?.id === session.user.id ? known.names : null;
  if (!names) {
    const { data, error } = await supabase
      .from('profiles')
      .select('last_name, first_name')
      .eq('id', session.user.id)
      .maybeSingle();
    names = data ?? { last_name: null, first_name: null };
    // A failed read is not remembered, so the next report tries again.
    if (!error) known = { id: session.user.id, names };
  }
  if (mine !== latest) return;
  publish({ status: 'in', role: claims.role, email: session.user.email ?? '', names });
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
