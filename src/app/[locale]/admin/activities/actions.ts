'use server';

import { redirect } from 'next/navigation';
import { DENIED, beginOperatorAction, invalid, text, writeRefusal } from '@/lib/board/actions';
import { activitySchema, readGallery, type BoardState } from '@/lib/board/forms';
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

async function removeFiles(supabase: Supabase, photos: (string | null)[]) {
  const files = photos.filter(isUploadedPhoto);
  if (files.length === 0) return;
  // The row no longer points at them, so a file left behind is on no page.
  await supabase.storage.from('activity-photos').remove(files);
}

export async function createActivity(_prev: BoardState, form: FormData): Promise<BoardState> {
  const context = await beginOperatorAction(form);
  if (!context) return DENIED;
  const parsed = activitySchema.safeParse(fields(form));
  if (!parsed.success) return invalid(parsed.error);
  const photo = photoOf(form);
  const gallery = readGallery(form.getAll('gallery'));
  if (photo === undefined || gallery === null) return DENIED;

  const { error } = await context.supabase
    .from('activities')
    .insert({ ...parsed.data, photo, gallery });
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
  const gallery = readGallery(form.getAll('gallery'));
  if (photo === undefined || gallery === null) return DENIED;

  const { data: before, error: readError } = await context.supabase
    .from('activities')
    .select('photo, gallery')
    .eq('id', id)
    .maybeSingle();
  if (readError) return writeRefusal(readError);
  if (!before) return DENIED;

  // A new photo has no description of its own, so the page falls back on the title.
  const changed = photo !== before.photo;
  const { data, error } = await context.supabase
    .from('activities')
    .update({
      ...parsed.data,
      photo,
      gallery,
      ...(changed ? { photo_alt_ko: '', photo_alt_en: '' } : {}),
    })
    .eq('id', id)
    .select('id');
  if (error) return writeRefusal(error);
  if (!data || data.length === 0) return DENIED;

  await removeFiles(context.supabase, [
    ...(changed ? [before.photo] : []),
    ...before.gallery.filter((path) => !gallery.includes(path)),
  ]);
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
    .select('photo, gallery');
  if (error) return writeRefusal(error);
  if (!data || data.length === 0) return DENIED;

  await removeFiles(context.supabase, [data[0].photo, ...data[0].gallery]);
  redirect(`/${context.locale}/admin/activities`);
}
