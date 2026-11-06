import { notFound } from 'next/navigation';
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

// No mail links here: the mails carry codes, entered on the screen that asked for them. A GET that
// signs the browser in cannot tell whether this browser asked for it, so a link to here could put a
// visitor into somebody else's account. It answers only where AUTH_CONFIRM_ROUTE is on, which is the
// accounts e2e (playwright.auth.config.ts), whose tests use it to sign in without a mail. Never set it
// on Vercel.
export async function GET(request: NextRequest, context: AuthRouteParams) {
  if (process.env.AUTH_CONFIRM_ROUTE !== 'on') notFound();
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
