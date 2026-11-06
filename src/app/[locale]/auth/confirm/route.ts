import type { NextRequest } from 'next/server';
import {
  authRouteLocale,
  blockedSignIn,
  finishSignIn,
  isBannedError,
  linkFailed,
  redirectTo,
  type AuthRouteParams,
} from '@/lib/auth/routes';
import { safeNext } from '@/lib/auth/redirect';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Where an emailed link lands: `?next=...&token_hash=...&type=...`. The type is `signup` for the first
// mail to a new address, `recovery` for a password reset, `email` for a sign-in link. A new account
// and a reset go on to choose a password; a password set before the mail was confirmed has been
// cleared by then (see the migration). The one-time token is checked here, on the server, so the link
// works in any browser, including the in-app browser of a mail app, and on whichever address asked
// for it (the email template builds the link from the address given when asking).
export async function GET(request: NextRequest, context: AuthRouteParams) {
  const locale = await authRouteLocale(context);
  const { searchParams } = request.nextUrl;

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  if (!tokenHash || (type !== 'signup' && type !== 'email' && type !== 'recovery')) {
    return linkFailed(locale);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type: type === 'recovery' ? 'recovery' : 'email',
    token_hash: tokenHash,
  });
  // A blocked account's link is refused by Auth itself; the person is told why.
  if (error) return isBannedError(error) ? blockedSignIn(locale) : linkFailed(locale);

  if (type === 'email') return finishSignIn(locale, searchParams.get('next'));

  const query = new URLSearchParams({ next: safeNext(searchParams.get('next'), locale) });
  if (type === 'signup') query.set('first', '1');
  return redirectTo(`/${locale}/reset-password?${query}`);
}
