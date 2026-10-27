import type { NextRequest } from 'next/server';
import {
  authRouteLocale,
  finishSignIn,
  linkFailed,
  oauthFailed,
  type AuthRouteParams,
} from '@/lib/auth/routes';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Where a sign-in that went through Supabase's own redirect (a one-time `code`) comes back to.
// The emailed sign-in link uses ../confirm instead; this serves any other provider that returns
// with a code. The code is traded for a session, which is stored in cookies by the Supabase client.
export async function GET(request: NextRequest, context: AuthRouteParams) {
  const locale = await authRouteLocale(context);
  const { searchParams } = request.nextUrl;

  // The provider's own refusal comes back as `?error=...&error_description=...` with no code.
  if (searchParams.has('error') || searchParams.has('error_description')) {
    return oauthFailed(locale);
  }

  const code = searchParams.get('code');
  if (!code) return linkFailed(locale);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return linkFailed(locale);

  return finishSignIn(locale, searchParams.get('next'));
}
