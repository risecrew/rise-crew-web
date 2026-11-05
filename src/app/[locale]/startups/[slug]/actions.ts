'use server';

import type { PostgrestError } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { asLocale } from '@/i18n/as-locale';
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
// comes back as a sentence and writes nothing.
async function begin(form: FormData) {
  const locale = asLocale(text(form, 'locale'));
  const viewer = await getViewer();
  if (!viewer || viewer.blocked) return null;
  const team = await getTeamBySlug(text(form, 'slug'));
  if (!team) return null;
  return { locale, viewer, team, supabase: await createSupabaseServerClient() };
}

const LOGO_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export async function saveIntro(_prev: TeamActionState, form: FormData): Promise<TeamActionState> {
  const context = await begin(form);
  if (!context) return DENIED;
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

  const logoPath = text(form, 'logo_path');
  if (logoPath && (!LOGO_PATH.test(logoPath) || !logoPath.startsWith(`${team.id}/`))) {
    return { ok: false, error: 'invalid' };
  }

  const { data, error } = await supabase
    .from('teams')
    .update({ ...parsed.data, logo_path: logoPath || null })
    .eq('id', team.id)
    .select('id');
  const refused = refusal(error, data);
  if (refused) return refused;

  // Only now is the old logo unused.
  if (team.logo_path && team.logo_path !== logoPath) {
    await supabase.storage.from('team-logos').remove([team.logo_path]);
  }
  redirect(`/${locale}/startups/${team.slug}`);
}

function photoPaths(form: FormData, teamId: string, postId: string): string[] | null {
  const paths = form.getAll('photo_path').filter((p): p is string => typeof p === 'string');
  if (paths.length > TEAM_LIMITS.photos) return null;
  return paths.every((path) => isPhotoPathFor(path, teamId, postId)) ? paths : null;
}

export async function createPost(_prev: TeamActionState, form: FormData): Promise<TeamActionState> {
  const context = await begin(form);
  if (!context) return DENIED;
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
  const refused = refusal(error, data);
  if (refused) return refused;
  redirect(`/${locale}/startups/${team.slug}/posts/${id}`);
}

export async function updatePost(_prev: TeamActionState, form: FormData): Promise<TeamActionState> {
  const context = await begin(form);
  if (!context) return DENIED;
  const { locale, team, supabase } = context;

  const id = text(form, 'id');
  if (!isUuid(id)) return { ok: false, error: 'invalid' };
  const parsed = postSchema.safeParse({
    title: text(form, 'title'),
    body: text(form, 'body'),
    visibility: text(form, 'visibility'),
  });
  if (!parsed.success) return invalid(parsed.error);
  const paths = photoPaths(form, team.id, id);
  if (!paths) return { ok: false, error: 'invalid' };

  const before = await getPost(team.id, id);
  if (!before) return DENIED;

  const { data, error } = await supabase
    .from('team_posts')
    .update({ ...parsed.data, photo_paths: paths })
    .eq('id', id)
    .eq('team_id', team.id)
    .select('id');
  const refused = refusal(error, data);
  if (refused) return refused;

  // Only now are the photos taken off the post unused.
  const removed = before.photo_paths.filter((path) => !paths.includes(path));
  if (removed.length > 0) await supabase.storage.from('team-post-photos').remove(removed);
  redirect(`/${locale}/startups/${team.slug}/posts/${id}`);
}

export async function deletePost(_prev: TeamActionState, form: FormData): Promise<TeamActionState> {
  const context = await begin(form);
  if (!context) return DENIED;
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
  const refused = refusal(error, data);
  if (refused) return refused;

  if (before.photo_paths.length > 0) {
    await supabase.storage.from('team-post-photos').remove(before.photo_paths);
  }
  redirect(`/${locale}/startups/${team.slug}`);
}
