import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import type { Locale } from '@/i18n/locales';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ProfileRow } from './profile';
import { safeNext } from './redirect';
import { atLeast, type AppRole } from './roles';

export type Viewer = {
  id: string;
  email: string;
  role: AppRole;
  blocked: boolean;
  onboarded: boolean;
  profile: ProfileRow;
};

// The signed-in visitor, or null. Who they are comes from the verified token (`getClaims()`);
// their role and whether they are blocked come from the database on every call, never from the
// token, which stays valid for up to an hour after a demotion or a block. The result is shared
// within one request, so a layout and its page do not query twice.
//
// An account whose profile or role row is gone (deleted on another device while this token was
// still valid) counts as signed out. A blocked account is still returned, with `blocked: true`;
// requireViewer and requireRole are what turn that into a refusal.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const id = claims.sub;

  const [profileResult, roleResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('user_roles').select('role, blocked_at').eq('user_id', id).maybeSingle(),
  ]);
  if (profileResult.error) throw new Error(profileResult.error.message);
  if (roleResult.error) throw new Error(roleResult.error.message);

  const profile = profileResult.data;
  const roleRow = roleResult.data;
  if (!profile || !roleRow) return null;

  return {
    id,
    email: typeof claims.email === 'string' && claims.email !== '' ? claims.email : profile.email,
    role: roleRow.role,
    blocked: roleRow.blocked_at !== null,
    onboarded: profile.onboarded_at !== null,
    profile,
  };
});

// `next` is the path the visitor was heading for (a page knows its own, as in
// `requireViewer(locale, `/${locale}/me`)`). It rides along to sign-in and sign-up so they can
// bring the visitor back; safeNext keeps it on this site.
function withNext(path: string, locale: Locale, next: string | undefined): string {
  return next === undefined ? path : `${path}?next=${encodeURIComponent(safeNext(next, locale))}`;
}

// For pages that need a finished account. Signed out goes to sign-in, an unfinished sign-up goes
// to the welcome form, and a blocked account is signed out and sent to sign-in with a notice.
export async function requireViewer(locale: Locale, next?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(withNext(`/${locale}/login`, locale, next));

  if (viewer.blocked) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      // Signing out is a courtesy; the refusal below does not depend on it.
    }
    redirect(`/${locale}/login?error=blocked`);
  }

  if (!viewer.onboarded) redirect(withNext(`/${locale}/welcome`, locale, next));
  return viewer;
}

// For pages that need a role (the members screen and its actions). Same as requireViewer, then a
// 404 below `min`: a page the visitor may not see should not admit that it exists. A blocked
// account gets the 404 whatever its role, so a blocked operator is shut out at once.
export async function requireRole(locale: Locale, min: AppRole, next?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(withNext(`/${locale}/login`, locale, next));
  if (viewer.blocked) notFound();
  if (!viewer.onboarded) redirect(withNext(`/${locale}/welcome`, locale, next));
  if (!atLeast(viewer.role, min)) notFound();
  return viewer;
}
