'use server';

import type { PostgrestError } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { asLocale } from '@/i18n/as-locale';
import { isAuthEnabled } from '@/lib/auth/config';
import { getViewer } from '@/lib/auth/viewer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TEAM_LIMITS, isPhotoPathFor, postSchema, teamIntroSchema } from '@/lib/teams/forms';
import { getPost, getTeamBySlug } from '@/lib/teams/queries';
import { isUuid } from '@/lib/teams/query';

// What a form hears back when it is not redirected away.
export type TeamActionState = {
  ok: false;
  error: 'denied' | 'invalid' | 'failed';
  fields?: Record<string, string>;
} | null;

const DENIED: TeamActionState = { ok: false, error: 'denied' };
const FAILED: TeamActionState = { ok: false, error: 'failed' };

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

function invalid(error: z.ZodError): TeamActionState {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const name = issue.path.join('.');
    if (!(name in fields)) fields[name] = issue.message;
  }
  return { ok: false, error: 'invalid', fields };
}

// The database is the one that says no: 42501 is its refusal, whether from a policy, a grant or a
// guard. A write that touched no row is a refusal too, because row level security hides the row.
function refusal(
  error: PostgrestError | null,
  rows: unknown[] | null,
): TeamActionState | undefined {
  if (error) return error.code === '42501' ? DENIED : FAILED;
  if (!rows || rows.length === 0) return DENIED;
  return undefined;
}

// Who is asking, and the team they mean. The team comes through the visitor's own session too. Every
// action starts here and then lets the database decide, so losing access while a form is open
// comes back as a sentence and writes nothing. With accounts switched off there is no such action.
async function begin(form: FormData) {
  if (!isAuthEnabled()) notFound();
  const locale = asLocale(text(form, 'locale'));
  try {
    const viewer = await getViewer();
    if (!viewer || viewer.blocked) return DENIED;
    const team = await getTeamBySlug(text(form, 'slug'));
    if (!team) return DENIED;
    return { locale, viewer, team, supabase: await createSupabaseServerClient() };
  } catch {
    // The database cannot be read. The form keeps what was typed and says to try again.
    return FAILED;
  }
}

function refused(context: Awaited<ReturnType<typeof begin>>): context is TeamActionState {
  return context === null || 'ok' in context;
}

// So the back button shows what was saved, not the text from before: the browser keeps pages it has
// seen, and this tells it to ask again for everything under the team.
function forgetTeamPages(locale: string, slug: string) {
  revalidatePath(`/${locale}/startups/${slug}`, 'layout');
}

const IMAGE_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

// What the form did with the team's logo or cover: kept it, removed it, or put up a new file.
function imageChange(
  form: FormData,
  name: 'logo' | 'cover',
  teamId: string,
): { changes: boolean; path: string | null } | 'invalid' {
  const change = text(form, `${name}_change`);
  if (change === 'remove') return { changes: true, path: null };
  if (change !== 'new') return { changes: false, path: null };
  const path = text(form, `${name}_path`);
  return IMAGE_PATH.test(path) && path.startsWith(`${teamId}/`)
    ? { changes: true, path }
    : 'invalid';
}

export async function saveIntro(_prev: TeamActionState, form: FormData): Promise<TeamActionState> {
  const context = await begin(form);
  if (refused(context)) return context;
  const { locale, team, supabase } = context;

  const kinds = form.getAll('link_kind');
  const links = form
    .getAll('link_url')
    .map((url, index) => ({ kind: kinds[index], url }))
    .filter((link) => typeof link.url === 'string' && link.url.trim() !== '');
  const parsed = teamIntroSchema.safeParse({
    tagline: text(form, 'tagline'),
    intro: text(form, 'intro'),
    links,
  });
  if (!parsed.success) return invalid(parsed.error);

  // Only an image this form changed is written, so saving an open form cannot undo a logo or cover
  // another member put up in the meantime.
  const logo = imageChange(form, 'logo', team.id);
  const cover = imageChange(form, 'cover', team.id);
  if (logo === 'invalid' || cover === 'invalid') return { ok: false, error: 'invalid' };

  const { data, error } = await supabase
    .from('teams')
    .update({
      ...parsed.data,
      ...(logo.changes ? { logo_path: logo.path } : {}),
      ...(cover.changes ? { cover_path: cover.path } : {}),
    })
    .eq('id', team.id)
    .select('id');
  const stopped = refusal(error, data);
  if (stopped) return stopped;

  // Only now are the old files unused.
  if (logo.changes && team.logo_path && team.logo_path !== logo.path) {
    await supabase.storage.from('team-logos').remove([team.logo_path]);
  }
  if (cover.changes && team.cover_path && team.cover_path !== cover.path) {
    await supabase.storage.from('team-covers').remove([team.cover_path]);
  }
  forgetTeamPages(locale, team.slug);
  redirect(`/${locale}/startups/${team.slug}`);
}

function photoPaths(form: FormData, teamId: string, postId: string): string[] | null {
  const paths = form.getAll('photo_path').filter((p): p is string => typeof p === 'string');
  if (paths.length > TEAM_LIMITS.photos) return null;
  return paths.every((path) => isPhotoPathFor(path, teamId, postId)) ? paths : null;
}

export async function createPost(_prev: TeamActionState, form: FormData): Promise<TeamActionState> {
  const context = await begin(form);
  if (refused(context)) return context;
  const { locale, viewer, team, supabase } = context;

  const id = text(form, 'id');
  const parsed = postSchema.safeParse({
    title: text(form, 'title'),
    body: text(form, 'body'),
    visibility: text(form, 'visibility'),
  });
  if (!parsed.success) return invalid(parsed.error);
  const paths = isUuid(id) ? photoPaths(form, team.id, id) : null;
  if (!paths) return { ok: false, error: 'invalid' };

  const { data, error } = await supabase
    .from('team_posts')
    .insert({
      ...parsed.data,
      id,
      team_id: team.id,
      author_id: viewer.id,
      photo_paths: paths,
    })
    .select('id');
  // The form sends the same id when it tries again, so a save whose answer got lost does not post
  // twice: the post is already there.
  if (error?.code !== '23505') {
    const stopped = refusal(error, data);
    if (stopped) return stopped;
  }
  forgetTeamPages(locale, team.slug);
  redirect(`/${locale}/startups/${team.slug}/posts/${id}`);
}

export async function updatePost(_prev: TeamActionState, form: FormData): Promise<TeamActionState> {
  const context = await begin(form);
  if (refused(context)) return context;
  const { locale, team, supabase } = context;

  const id = text(form, 'id');
  if (!isUuid(id)) return { ok: false, error: 'invalid' };
  const parsed = postSchema.safeParse({
    title: text(form, 'title'),
    body: text(form, 'body'),
    visibility: text(form, 'visibility'),
  });
  if (!parsed.success) return invalid(parsed.error);
  const added = photoPaths(form, team.id, id);
  if (!added) return { ok: false, error: 'invalid' };

  const before = await getPost(team.id, id);
  if (!before) return DENIED;

  // The form says what it took off and what it added, not the whole list, so saving an open form
  // cannot undo a photo another member added in the meantime.
  const asked = form.getAll('removed_path');
  const removed = before.photo_paths.filter((path) => asked.includes(path));
  const paths = [...before.photo_paths.filter((path) => !removed.includes(path)), ...added];
  if (paths.length > TEAM_LIMITS.photos) return { ok: false, error: 'invalid' };

  const { data, error } = await supabase
    .from('team_posts')
    .update({ ...parsed.data, photo_paths: paths })
    .eq('id', id)
    .eq('team_id', team.id)
    .select('id');
  const stopped = refusal(error, data);
  if (stopped) return stopped;

  // Only now are the photos taken off the post unused.
  if (removed.length > 0) await supabase.storage.from('team-post-photos').remove(removed);
  forgetTeamPages(locale, team.slug);
  redirect(`/${locale}/startups/${team.slug}/posts/${id}`);
}

export async function deletePost(_prev: TeamActionState, form: FormData): Promise<TeamActionState> {
  const context = await begin(form);
  if (refused(context)) return context;
  const { locale, team, supabase } = context;

  const id = text(form, 'id');
  if (!isUuid(id)) return DENIED;
  const before = await getPost(team.id, id);
  if (!before) return DENIED;

  const { data, error } = await supabase
    .from('team_posts')
    .delete()
    .eq('id', id)
    .eq('team_id', team.id)
    .select('id');
  const stopped = refusal(error, data);
  if (stopped) return stopped;

  if (before.photo_paths.length > 0) {
    await supabase.storage.from('team-post-photos').remove(before.photo_paths);
  }
  forgetTeamPages(locale, team.slug);
  redirect(`/${locale}/startups/${team.slug}`);
}
