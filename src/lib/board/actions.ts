import 'server-only';
import type { PostgrestError } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import type { z } from 'zod';
import { asLocale } from '@/i18n/as-locale';
import { isAuthEnabled } from '@/lib/auth/config';
import { atLeast } from '@/lib/auth/roles';
import { getViewer } from '@/lib/auth/viewer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { BoardState } from './forms';

export const DENIED: BoardState = { ok: false, error: 'denied' };
export const FAILED: BoardState = { ok: false, error: 'failed' };

export function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

export function invalid(error: z.ZodError): BoardState {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const name = issue.path.join('.');
    if (!(name in fields)) fields[name] = issue.message;
  }
  return { ok: false, error: 'invalid', fields };
}

export function writeRefusal(error: PostgrestError): BoardState {
  return error.code === '42501' ? DENIED : FAILED;
}

// Everything is written with the operator's own session, so the database checks the role again on
// every write. This check only turns a refusal into a sentence earlier.
export async function beginOperatorAction(form: FormData) {
  if (!isAuthEnabled()) notFound();
  const locale = asLocale(text(form, 'locale'));
  const viewer = await getViewer();
  if (!viewer || viewer.blocked || !atLeast(viewer.role, 'operator')) return null;
  return { locale, supabase: await createSupabaseServerClient() };
}
