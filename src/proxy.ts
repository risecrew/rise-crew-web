import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { isAuthEnabled } from './lib/auth/config';
import { refreshSession } from './lib/supabase/proxy';

const handleLocale = createMiddleware(routing);

// Every page request first gets its language (next-intl). With accounts switched on, the visitor's
// session is also kept fresh here, so an expiring login is renewed before any page reads it. With
// the switch off, Supabase is never touched and this does what it did before accounts existed.
export default async function proxy(request: NextRequest) {
  const response = handleLocale(request);
  return isAuthEnabled() ? refreshSession(request, response) : response;
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
