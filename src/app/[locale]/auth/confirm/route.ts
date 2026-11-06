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

// Where an emailed link lands: `?next=...&token_hash=...&type=...`. The type is `email` for a
// confirmation, `recovery` for a password reset. The one-time token is checked here, on the server,
// so the link works in any browser, including the in-app browser of a mail app, and on whichever
// address asked for it (the email template builds the link from the address given when asking).
export async function GET(request: NextRequest, context: AuthRouteParams) {
  const locale = await authRouteLocale(context);
  const { searchParams } = request.nextUrl;

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  if (!tokenHash || (type !== 'email' && type !== 'recovery')) return linkFailed(locale);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  // A blocked account's link is refused by Auth itself; the person is told why.
  if (error) return isBannedError(error) ? blockedSignIn(locale) : linkFailed(locale);

  if (type === 'recovery') {
    const next = safeNext(searchParams.get('next'), locale);
    return redirectTo(`/${locale}/reset-password?next=${encodeURIComponent(next)}`);
  }
  return finishSignIn(locale, searchParams.get('next'));
}
