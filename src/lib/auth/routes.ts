import { notFound } from 'next/navigation';
import { NextResponse } from 'next/server';
import { asLocale } from '@/i18n/as-locale';
import type { Locale } from '@/i18n/locales';
import { isAuthEnabled } from './config';
import { safeNext } from './redirect';
import { getViewer, type Viewer } from './viewer';

// The params every route under app/[locale]/auth/ receives.
export type AuthRouteParams = { params: Promise<{ locale: string }> };

// The locale of an auth route. With accounts switched off the routes do not exist (404), exactly
// as before they were added; an unknown locale is a 404 as well.
export async function authRouteLocale({ params }: AuthRouteParams): Promise<Locale> {
  if (!isAuthEnabled()) notFound();
  return asLocale((await params).locale);
}

// A redirect to a path on this site. The Location is the bare path, so the browser resolves it
// against the address it actually used; building an absolute URL from request.url would trust the
// host Next reports (`next start` says "localhost" even when reached as 127.0.0.1). No cache may
// keep the response, because it can carry someone's session cookies.
export function redirectTo(path: string, status = 307): NextResponse {
  return new NextResponse(null, {
    status,
    headers: {
      Location: path,
      'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
    },
  });
}

// Where every sign-in link that cannot be used ends up (used, expired, mistyped, wrong kind).
export function linkFailed(locale: Locale): NextResponse {
  return redirectTo(`/${locale}/login?error=link`);
}

// Where a Google sign-in that did not finish ends up (the visitor pressed Cancel, or Google or
// Supabase refused).
export function oauthFailed(locale: Locale): NextResponse {
  return redirectTo(`/${locale}/login?error=oauth`);
}

// Once a link has signed the visitor in (the session cookies are already set): a new account goes
// on to the welcome form, which brings them back to `next` afterwards; a finished account goes
// straight to `next`. `next` comes from the query string, so safeNext vets it.
export async function finishSignIn(locale: Locale, next: string | null): Promise<NextResponse> {
  // getViewer throws when the database cannot be read. The one-time token is already spent by
  // now, so even then the visitor lands on the login page, not on an error page.
  let viewer: Viewer | null;
  try {
    viewer = await getViewer();
  } catch {
    return linkFailed(locale);
  }
  if (!viewer) return linkFailed(locale);

  const target = safeNext(next, locale);
  if (!viewer.onboarded) {
    return redirectTo(`/${locale}/welcome?next=${encodeURIComponent(target)}`);
  }
  return redirectTo(target);
}
