'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { locales } from '@/i18n/locales';
import { DENIED, beginOperatorAction, invalid, text, writeRefusal } from '@/lib/board/actions';
import { noticeSchema, type BoardState } from '@/lib/board/forms';
import { isUuid } from '@/lib/teams/query';

function fields(form: FormData) {
  return {
    title_ko: text(form, 'title_ko'),
    title_en: text(form, 'title_en'),
    body_ko: text(form, 'body_ko'),
    body_en: text(form, 'body_en'),
    is_pinned: form.get('is_pinned') === 'on',
  };
}

function refreshPublicPages(id: string) {
  for (const locale of locales) {
    revalidatePath(`/${locale}/notices`);
    revalidatePath(`/${locale}/notices/${id}`);
  }
}

export async function createNotice(_prev: BoardState, form: FormData): Promise<BoardState> {
  const context = await beginOperatorAction(form);
  if (!context) return DENIED;
  const parsed = noticeSchema.safeParse(fields(form));
  if (!parsed.success) return invalid(parsed.error);

  const { data, error } = await context.supabase
    .from('notices')
    .insert(parsed.data)
    .select('id')
    .single();
  if (error) return writeRefusal(error);
  refreshPublicPages(data.id);
  redirect(`/${context.locale}/admin/notices`);
}

export async function updateNotice(_prev: BoardState, form: FormData): Promise<BoardState> {
  const context = await beginOperatorAction(form);
  if (!context) return DENIED;
  const id = text(form, 'id');
  if (!isUuid(id)) return DENIED;
  const parsed = noticeSchema.safeParse(fields(form));
  if (!parsed.success) return invalid(parsed.error);

  const { data, error } = await context.supabase
    .from('notices')
    .update(parsed.data)
    .eq('id', id)
    .select('id');
  if (error) return writeRefusal(error);
  if (!data || data.length === 0) return DENIED;
  refreshPublicPages(id);
  redirect(`/${context.locale}/admin/notices`);
}

export async function deleteNotice(_prev: BoardState, form: FormData): Promise<BoardState> {
  const context = await beginOperatorAction(form);
  if (!context) return DENIED;
  const id = text(form, 'id');
  if (!isUuid(id)) return DENIED;

  const { data, error } = await context.supabase.from('notices').delete().eq('id', id).select('id');
  if (error) return writeRefusal(error);
  if (!data || data.length === 0) return DENIED;
  refreshPublicPages(id);
  redirect(`/${context.locale}/admin/notices`);
}
