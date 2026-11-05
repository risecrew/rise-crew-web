'use server';

import type { PostgrestError } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { asLocale } from '@/i18n/as-locale';
import { isAuthEnabled } from '@/lib/auth/config';
import { atLeast } from '@/lib/auth/roles';
import { getViewer } from '@/lib/auth/viewer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { makeTeamSlug, teamCreateSchema, teamSettingsSchema } from '@/lib/teams/forms';
import { isUuid } from '@/lib/teams/query';

// What an operator's form hears back. Everything is written with the operator's own session, so the
// database checks the role again on every write; this file only turns its answers into sentences.
export type TeamAdminState =
  | { ok: true }
  | {
      ok: false;
      error: 'denied' | 'invalid' | 'failed' | 'needsMember' | 'noAccount' | 'alreadyInTeam';
      fields?: Record<string, string>;
    }
  | null;

const DENIED: TeamAdminState = { ok: false, error: 'denied' };
const FAILED: TeamAdminState = { ok: false, error: 'failed' };

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

function invalid(error: z.ZodError): TeamAdminState {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const name = issue.path.join('.');
    if (!(name in fields)) fields[name] = issue.message;
  }
  return { ok: false, error: 'invalid', fields };
}

function writeRefusal(error: PostgrestError): TeamAdminState {
  return error.code === '42501' ? DENIED : FAILED;
}

async function begin(form: FormData) {
  if (!isAuthEnabled()) notFound();
  const locale = asLocale(text(form, 'locale'));
  const viewer = await getViewer();
  if (!viewer || viewer.blocked || !atLeast(viewer.role, 'operator')) return null;
  return { locale, supabase: await createSupabaseServerClient() };
}

function teamFields(form: FormData) {
  return {
    name: text(form, 'name'),
    field: text(form, 'field'),
    cohort: text(form, 'cohort').trim(),
  };
}

export async function createTeam(_prev: TeamAdminState, form: FormData): Promise<TeamAdminState> {
  const context = await begin(form);
  if (!context) return DENIED;
  const parsed = teamCreateSchema.safeParse(teamFields(form));
  if (!parsed.success) return invalid(parsed.error);

  // The ending is random, so a clash is very unlikely; another ending settles it.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await context.supabase
      .from('teams')
      .insert({ ...parsed.data, slug: makeTeamSlug(parsed.data.name) })
      .select('id')
      .single();
    if (!error) redirect(`/${context.locale}/admin/teams/${data.id}`);
    if (error.code !== '23505') return writeRefusal(error);
  }
  return FAILED;
}

export async function updateTeamSettings(
  _prev: TeamAdminState,
  form: FormData,
): Promise<TeamAdminState> {
  const context = await begin(form);
  if (!context) return DENIED;
  const id = text(form, 'team_id');
  if (!isUuid(id)) return DENIED;
  const parsed = teamSettingsSchema.safeParse({
    ...teamFields(form),
    is_published: form.get('is_published') === 'on' ? 'on' : undefined,
  });
  if (!parsed.success) return invalid(parsed.error);

  const { data, error } = await context.supabase
    .from('teams')
    .update(parsed.data)
    .eq('id', id)
    .select('id');
  if (error) return writeRefusal(error);
  if (!data || data.length === 0) return DENIED;
  revalidatePath(`/${context.locale}/admin/teams/${id}`);
  return { ok: true };
}

export async function addTeamMember(
  _prev: TeamAdminState,
  form: FormData,
): Promise<TeamAdminState> {
  const context = await begin(form);
  if (!context) return DENIED;
  const teamId = text(form, 'team_id');
  if (!isUuid(teamId)) return DENIED;
  const email = text(form, 'email').trim().toLowerCase();
  if (!email) return { ok: false, error: 'invalid', fields: { email: 'required' } };

  // An unfinished sign-up is on nobody's list, so it counts as no account.
  const { data: person, error: findError } = await context.supabase
    .from('member_list')
    .select('id, role, blocked_at')
    .ilike('email', email.replace(/[\\%_]/g, '\\$&'))
    .maybeSingle();
  if (findError) return FAILED;
  if (!person?.id) return { ok: false, error: 'noAccount' };
  if (person.blocked_at || person.role === 'guest') return { ok: false, error: 'needsMember' };

  const { error } = await context.supabase
    .from('team_members')
    .insert({ team_id: teamId, user_id: person.id });
  if (error) {
    // The database has the last word on the role, in case it changed since the check above.
    if (error.code === 'P0001') return { ok: false, error: 'needsMember' };
    if (error.code === '23505') return { ok: false, error: 'alreadyInTeam' };
    return error.code === '42501' ? DENIED : FAILED;
  }
  revalidatePath(`/${context.locale}/admin/teams/${teamId}`);
  return { ok: true };
}

export async function removeTeamMember(
  _prev: TeamAdminState,
  form: FormData,
): Promise<TeamAdminState> {
  const context = await begin(form);
  if (!context) return DENIED;
  const teamId = text(form, 'team_id');
  const userId = text(form, 'user_id');
  if (!isUuid(teamId) || !isUuid(userId)) return DENIED;

  const { data, error } = await context.supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .select('user_id');
  if (error) return error.code === '42501' ? DENIED : FAILED;
  if (!data || data.length === 0) return DENIED;
  revalidatePath(`/${context.locale}/admin/teams/${teamId}`);
  return { ok: true };
}

export async function setPostHidden(
  _prev: TeamAdminState,
  form: FormData,
): Promise<TeamAdminState> {
  const context = await begin(form);
  if (!context) return DENIED;
  const id = text(form, 'post_id');
  if (!isUuid(id)) return DENIED;

  const { data, error } = await context.supabase
    .from('team_posts')
    .update({ hidden_at: text(form, 'hidden') === '1' ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id, team_id');
  if (error) return error.code === '42501' ? DENIED : FAILED;
  if (!data || data.length === 0) return DENIED;
  // Both screens that show the post, in whichever language.
  revalidatePath(`/${context.locale}/admin/teams/${data[0].team_id}`);
  revalidatePath(`/${context.locale}/startups`, 'layout');
  return { ok: true };
}
