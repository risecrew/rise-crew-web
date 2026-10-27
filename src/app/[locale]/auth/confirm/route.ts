import type { NextRequest } from 'next/server';
import { authRouteLocale, finishSignIn, linkFailed, type AuthRouteParams } from '@/lib/auth/routes';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Where the emailed sign-in link lands: `?next=...&token_hash=...&type=email`. The one-time token
// is checked here, on the server, so the link works in any browser, including the in-app browser
// of a mail app, and on whichever address asked for it (the email template builds the link from
// the address given as emailRedirectTo).
export async function GET(request: NextRequest, context: AuthRouteParams) {
  const locale = await authRouteLocale(context);
  const { searchParams } = request.nextUrl;

  const tokenHash = searchParams.get('token_hash');
  if (!tokenHash || searchParams.get('type') !== 'email') return linkFailed(locale);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type: 'email', token_hash: tokenHash });
  if (error) return linkFailed(locale);

  return finishSignIn(locale, searchParams.get('next'));
}
