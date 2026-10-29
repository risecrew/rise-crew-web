'use server';

import { notFound, redirect } from 'next/navigation';
import { asLocale } from '@/i18n/as-locale';
import type { Locale } from '@/i18n/locales';
import { isAuthEnabled } from '@/lib/auth/config';
import { leaveWelcome } from '@/lib/auth/login';
import { PRIVACY_POLICY_VERSION, type ProfileUpdate } from '@/lib/auth/profile';
import { parseProfileForm, readProfileForm } from '@/lib/auth/profile-form';
import type { FieldErrors, ProfileFormFailure, ProfileFormState } from '@/lib/auth/profile-values';
import { safeNext } from '@/lib/auth/redirect';
import { getViewer, type Viewer } from '@/lib/auth/viewer';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Mode = 'welcome' | 'edit';

function failure(
  values: ProfileFormFailure['values'],
  fieldErrors: FieldErrors,
): ProfileFormFailure {
  return { ok: false, fieldErrors, values, at: Date.now() };
}

// Saves the sign-up form (mode `welcome`) or an edit of the profile (mode `edit`) for the account
// that is signed in, then sends the visitor on to `next`.
//
// Everything here comes from the browser and is checked again: who is asking comes from the
// session, `mode` is compared with whether the account has finished signing up, and `next` goes
// through safeNext. The database has the last word: consents are recorded first because it will
// not mark the sign-up as done without them (see guard_onboarding in the migration), and
// `recruit_opt_in` is not written at all, it follows the newest `recruit` consent.
//
// A refused form comes back as a value for the form to show. A saved one never returns: the
// visitor is redirected.
export async function saveProfile(
  localeArg: Locale,
  modeArg: Mode,
  next: string | null,
  form: FormData,
): Promise<ProfileFormFailure> {
  // Accounts switched off: there is no sign-up, as there is no page for it.
  if (!isAuthEnabled()) notFound();
  const locale = asLocale(localeArg);
  const mode: Mode = modeArg === 'edit' ? 'edit' : 'welcome';
  const target = mode === 'edit' ? safeNext(next, locale) : leaveWelcome(next, locale);
  const typed = readProfileForm(form);
  const toLogin = `/${locale}/login${target === `/${locale}` ? '' : `?next=${encodeURIComponent(target)}`}`;

  let viewer: Viewer | null;
  try {
    viewer = await getViewer();
  } catch {
    return failure(typed, { form: 'save_failed' });
  }
  if (!viewer) redirect(toLogin);
  if (viewer.blocked) redirect(`/${locale}/login?error=blocked`);
  // The form the browser used does not match where the account is: the sign-up is already done
  // (nothing to save, carry on), or an edit is asked of an account that has not signed up yet.
  if (mode === 'welcome' && viewer.onboarded) redirect(target);
  if (mode === 'edit' && !viewer.onboarded) {
    redirect(`/${locale}/welcome?next=${encodeURIComponent(target)}`);
  }

  const parsed = parseProfileForm(form, mode);
  if (!parsed.ok) return failure(parsed.values, parsed.fieldErrors);
  const { data } = parsed;

  const supabase = await createSupabaseServerClient();
  const consent = (kind: 'privacy' | 'age14' | 'recruit', granted: boolean) => ({
    user_id: viewer.id,
    kind,
    granted,
    policy_version: PRIVACY_POLICY_VERSION,
  });

  // Signing up: the consents first, as one statement.
  if (mode === 'welcome') {
    const { error } = await supabase
      .from('consents')
      .insert([consent('privacy', true), consent('age14', true), consent('recruit', data.recruit)]);
    if (error) return saveFailed(parsed.values, error);
  }

  const update: ProfileUpdate = {
    last_name: data.last_name,
    first_name: data.first_name,
    occupation: data.occupation,
    school: data.school,
    major: data.major,
    affiliation: data.affiliation,
  };
  // The database stamps its own time; the value only says "now that the consents are in".
  if (mode === 'welcome') update.onboarded_at = new Date().toISOString();

  // `select` makes a row the policy hides show up as zero rows instead of as a silent success.
  const { data: saved, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', viewer.id)
    .select('id');
  if (error || saved?.length !== 1) return saveFailed(parsed.values, error);

  // Editing: a changed answer about recruitment mail is a new entry in the consent log.
  if (mode === 'edit' && data.recruit !== viewer.profile.recruit_opt_in) {
    const { error: consentError } = await supabase
      .from('consents')
      .insert(consent('recruit', data.recruit));
    if (consentError) return saveFailed(parsed.values, consentError);
  }

  redirect(target);
}

// Whatever went wrong, the visitor sees one message and can send the form again. Sending again
// adds fresh consent rows, which is harmless: the newest row of each kind is the one that counts.
function saveFailed(
  values: ProfileFormFailure['values'],
  error: { code?: string; message: string } | null,
): ProfileFormFailure {
  // The code and message say what the database refused, not who the person is.
  console.error('Could not save a profile:', error?.code ?? 'no row updated', error?.message ?? '');
  return failure(values, { form: 'save_failed' });
}

// What the sign-up form calls. `useActionState` hands the previous state in front of the form, and
// the three things saveProfile needs besides the fields come in the form as `locale`, `mode` and
// `next`. (Binding them as arguments is the usual way, but it makes React render the form forever
// when a plain form post, with no JavaScript, is refused and the form is shown again.) The result
// is the same as saveProfile's.
export async function submitProfile(
  _previous: ProfileFormState,
  form: FormData,
): Promise<ProfileFormFailure> {
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === 'string' ? value : '';
  };
  // saveProfile checks all three (an unknown language is a 404, anything but `edit` is the sign-up).
  return saveProfile(text('locale') as Locale, text('mode') as Mode, text('next') || null, form);
}
