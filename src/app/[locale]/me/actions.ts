'use server';

import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { asLocale } from '@/i18n/as-locale';
import type { Locale } from '@/i18n/locales';
import { isAuthEnabled } from '@/lib/auth/config';
import { confirmsDeletion, type DeletionFailure, type DeletionState } from '@/lib/auth/deletion';
import { wouldLeaveNoAdmin } from '@/lib/auth/last-admin';
import { getViewer, requireViewer } from '@/lib/auth/viewer';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// `sb-<project>-auth-token`, split into `.0`, `.1` when it does not fit in one cookie.
const SESSION_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

function refused(error: DeletionFailure['error'], typed: string): DeletionFailure {
  return { error, typed, at: Date.now() };
}

// Ends this browser's session once its account is gone. Signing out is what clears the cookies;
// if that cannot finish (Auth is unreachable), the cookies are removed here, so the browser is
// not left holding a login for an account that no longer exists.
async function endSession(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (!error) return;
  } catch {
    // Handled below, the same as an error that was returned.
  }
  const store = await cookies();
  for (const { name } of store.getAll()) {
    if (SESSION_COOKIE.test(name)) store.delete(name);
  }
}

// Deletes the signed-in visitor's account, once they have typed the word that confirms it. The
// auth user is removed with the secret key; the profile, the role and the consent log go with it
// (they are tied to it in the database). Then the session ends and the visitor lands on the home
// page, which says so.
//
// Nothing here is taken on trust from the page. Who is asking is read again from the session and
// the database (a visitor who was signed out or blocked since the page opened is refused), the
// word is checked against the language's own, the last admin who can sign in is kept (the site
// would have nobody to hand the role on), and only the visitor's own account can be named: the id
// comes from the session, never from the form.
//
// A refused attempt comes back as a value for the form to show. A deleted account never returns:
// the visitor is redirected.
export async function deleteAccount(localeArg: Locale, form: FormData): Promise<DeletionFailure> {
  // Accounts switched off: there is no My page, as there is no page for it.
  if (!isAuthEnabled()) notFound();
  const locale = asLocale(localeArg);
  const typedValue = form.get('confirm');
  const typed = typeof typedValue === 'string' ? typedValue : '';

  // getViewer throws when the database cannot be read. Asked here first, so that requireViewer
  // below (which asks again, and gets the same answer within this request) only has to turn a
  // signed-out, unfinished or blocked account into the right redirect.
  try {
    await getViewer();
  } catch {
    return refused('failed', typed);
  }
  const viewer = await requireViewer(locale, `/${locale}/me`);

  const word = (await getTranslations({ locale, namespace: 'Auth.me.delete' }))('word');
  if (!confirmsDeletion(typedValue, word)) return refused('confirm', typed);

  // The site must never be left without an admin who can sign in, so the last one cannot leave.
  // If that cannot be found out, the account stays: a refusal can be tried again, a deletion
  // cannot be taken back.
  try {
    if (await wouldLeaveNoAdmin([viewer.id])) return refused('lastAdmin', typed);
  } catch (error) {
    console.error('Could not check the admins:', error instanceof Error ? error.message : error);
    return refused('failed', typed);
  }

  try {
    const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(viewer.id);
    if (error) throw error;
  } catch (error) {
    // The code and message say what Auth refused, not who the person is.
    const { code, message } = error as { code?: string; message?: string };
    console.error('Could not delete an account:', code ?? 'unknown', message ?? '');
    return refused('failed', typed);
  }

  await endSession();
  redirect(`/${locale}?deleted=1`);
}

// What the delete form calls. `useActionState` hands the previous state in front of the form, and
// the language comes in the form as `locale` (binding it as an argument is the usual way, but it
// makes React render the form forever when a plain form post, with no JavaScript, is refused and
// the form is shown again; see submitProfile). The result is the same as deleteAccount's.
export async function submitDeletion(
  _previous: DeletionState,
  form: FormData,
): Promise<DeletionFailure> {
  const locale = form.get('locale');
  // deleteAccount checks it (an unknown language is a 404).
  return deleteAccount((typeof locale === 'string' ? locale : '') as Locale, form);
}
