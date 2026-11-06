'use server';

import { redirect } from 'next/navigation';
import { DENIED, beginOperatorAction, invalid, text, writeRefusal } from '@/lib/board/actions';
import {
  attachmentsSchema,
  noticePhotosSchema,
  noticeSchema,
  readAttachments,
  type Attachment,
  type BoardState,
} from '@/lib/board/forms';
import { isUuid } from '@/lib/teams/query';

type Supabase = NonNullable<Awaited<ReturnType<typeof beginOperatorAction>>>['supabase'];

function fields(form: FormData) {
  return {
    title_ko: text(form, 'title_ko'),
    title_en: text(form, 'title_en'),
    body_ko: text(form, 'body_ko'),
    body_en: text(form, 'body_en'),
    is_pinned: form.get('is_pinned') === 'on',
  };
}

// What the form settled on: uploads it just made and what it started with. Null when it is not what
// the form sends, which the form itself never does.
function attachedOf(form: FormData): { photo_paths: string[]; attachments: Attachment[] } | null {
  try {
    const photos = noticePhotosSchema.safeParse(JSON.parse(text(form, 'photo_paths') || '[]'));
    const files = attachmentsSchema.safeParse(JSON.parse(text(form, 'attachments') || '[]'));
    if (!photos.success || !files.success) return null;
    return { photo_paths: photos.data, attachments: files.data };
  } catch {
    return null;
  }
}

function pathsOf(row: { photo_paths: string[]; attachments: unknown }): string[] {
  return [...row.photo_paths, ...readAttachments(row.attachments).map((file) => file.path)];
}

async function removeFiles(supabase: Supabase, paths: string[]) {
  if (paths.length === 0) return;
  // The row no longer points at them, so a file left behind is on no page.
  await supabase.storage.from('notice-files').remove(paths);
}

export async function createNotice(_prev: BoardState, form: FormData): Promise<BoardState> {
  const context = await beginOperatorAction(form);
  if (!context) return DENIED;
  const parsed = noticeSchema.safeParse(fields(form));
  if (!parsed.success) return invalid(parsed.error);
  const attached = attachedOf(form);
  if (!attached) return DENIED;

  const { error } = await context.supabase.from('notices').insert({ ...parsed.data, ...attached });
  if (error) return writeRefusal(error);
  redirect(`/${context.locale}/admin/notices`);
}

export async function updateNotice(_prev: BoardState, form: FormData): Promise<BoardState> {
  const context = await beginOperatorAction(form);
  if (!context) return DENIED;
  const id = text(form, 'id');
  if (!isUuid(id)) return DENIED;
  const parsed = noticeSchema.safeParse(fields(form));
  if (!parsed.success) return invalid(parsed.error);
  const attached = attachedOf(form);
  if (!attached) return DENIED;

  const { data: before, error: readError } = await context.supabase
    .from('notices')
    .select('photo_paths, attachments')
    .eq('id', id)
    .maybeSingle();
  if (readError) return writeRefusal(readError);
  if (!before) return DENIED;

  const { data, error } = await context.supabase
    .from('notices')
    .update({ ...parsed.data, ...attached })
    .eq('id', id)
    .select('id');
  if (error) return writeRefusal(error);
  if (!data || data.length === 0) return DENIED;

  const kept = new Set(pathsOf(attached));
  await removeFiles(
    context.supabase,
    pathsOf(before).filter((path) => !kept.has(path)),
  );
  redirect(`/${context.locale}/admin/notices`);
}

export async function deleteNotice(_prev: BoardState, form: FormData): Promise<BoardState> {
  const context = await beginOperatorAction(form);
  if (!context) return DENIED;
  const id = text(form, 'id');
  if (!isUuid(id)) return DENIED;

  const { data, error } = await context.supabase
    .from('notices')
    .delete()
    .eq('id', id)
    .select('photo_paths, attachments');
  if (error) return writeRefusal(error);
  if (!data || data.length === 0) return DENIED;

  await removeFiles(context.supabase, pathsOf(data[0]));
  redirect(`/${context.locale}/admin/notices`);
}
