import { notFound } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { authRouteLocale, redirectTo, type AuthRouteParams } from '@/lib/auth/routes';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Signs the visitor out of this browser (their sessions on other devices stay) and returns to the
// locale home. Only POST signs anyone out: a link or an image that merely loads this address must
// not. 303 makes the browser follow with a GET.
export async function POST(_request: NextRequest, context: AuthRouteParams) {
  const locale = await authRouteLocale(context);

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: 'local' });

  return redirectTo(`/${locale}`, 303);
}

// Opening this address in the browser is a plain 404, as it was before the route existed.
export function GET() {
  notFound();
}
