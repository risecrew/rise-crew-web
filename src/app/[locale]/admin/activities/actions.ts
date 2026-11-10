'use server';

import { redirect } from 'next/navigation';
import { DENIED, beginOperatorAction, invalid, text, writeRefusal } from '@/lib/board/actions';
import { activitySchema, type BoardState } from '@/lib/board/forms';
import { isUploadedPhoto } from '@/lib/board/text';
import { isUuid } from '@/lib/teams/query';

type Supabase = NonNullable<Awaited<ReturnType<typeof beginOperatorAction>>>['supabase'];

const PHOTO = /^([0-9a-f-]{36}\.(jpg|png|webp)|\/images\/activities\/[a-z0-9-]+\.(jpg|png|webp))$/;

function fields(form: FormData) {
  return {
    date: text(form, 'date'),
    end_date: text(form, 'end_date'),
    title_ko: text(form, 'title_ko'),
    title_en: text(form, 'title_en'),
    city_ko: text(form, 'city_ko'),
    city_en: text(form, 'city_en'),
    summary_ko: text(form, 'summary_ko'),
    summary_en: text(form, 'summary_en'),
    body_ko: text(form, 'body_ko'),
    body_en: text(form, 'body_en'),
    results_ko: text(form, 'results_ko'),
    results_en: text(form, 'results_en'),
    is_planned: form.get('is_planned') === 'on',
  };
}

// The photo the form settled on: an upload it just made, the one it started with, or none.
function photoOf(form: FormData): string | null | undefined {
  const photo = text(form, 'photo');
  if (photo === '') return null;
  return PHOTO.test(photo) ? photo : undefined;
}

async function removeFile(supabase: Supabase, photo: string | null) {
  if (!isUploadedPhoto(photo)) return;
  // The row no longer points at it, so a file left behind is on no page.
  await supabase.storage.from('activity-photos').remove([photo]);
}

export async function createActivity(_prev: BoardState, form: FormData): Promise<BoardState> {
  const context = await beginOperatorAction(form);
  if (!context) return DENIED;
  const parsed = activitySchema.safeParse(fields(form));
  if (!parsed.success) return invalid(parsed.error);
  const photo = photoOf(form);
  if (photo === undefined) return DENIED;

  const { error } = await context.supabase.from('activities').insert({ ...parsed.data, photo });
  if (error) return writeRefusal(error);
  redirect(`/${context.locale}/admin/activities`);
}

export async function updateActivity(_prev: BoardState, form: FormData): Promise<BoardState> {
  const context = await beginOperatorAction(form);
  if (!context) return DENIED;
  const id = text(form, 'id');
  if (!isUuid(id)) return DENIED;
  const parsed = activitySchema.safeParse(fields(form));
  if (!parsed.success) return invalid(parsed.error);
  const photo = photoOf(form);
  if (photo === undefined) return DENIED;

  const { data: before, error: readError } = await context.supabase
    .from('activities')
    .select('photo')
    .eq('id', id)
    .maybeSingle();
  if (readError) return writeRefusal(readError);
  if (!before) return DENIED;

  // A new photo has no description of its own, so the page falls back on the title.
  const changed = photo !== before.photo;
  const { data, error } = await context.supabase
    .from('activities')
    .update({ ...parsed.data, photo, ...(changed ? { photo_alt_ko: '', photo_alt_en: '' } : {}) })
    .eq('id', id)
    .select('id');
  if (error) return writeRefusal(error);
  if (!data || data.length === 0) return DENIED;

  if (changed) await removeFile(context.supabase, before.photo);
  redirect(`/${context.locale}/admin/activities`);
}

export async function deleteActivity(_prev: BoardState, form: FormData): Promise<BoardState> {
  const context = await beginOperatorAction(form);
  if (!context) return DENIED;
  const id = text(form, 'id');
  if (!isUuid(id)) return DENIED;

  const { data, error } = await context.supabase
    .from('activities')
    .delete()
    .eq('id', id)
    .select('photo');
  if (error) return writeRefusal(error);
  if (!data || data.length === 0) return DENIED;

  await removeFile(context.supabase, data[0].photo);
  redirect(`/${context.locale}/admin/activities`);
}
